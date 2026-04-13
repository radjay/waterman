---
title: "feat: Webcam session recording — record HLS streams to MP4 for playback"
type: feat
status: active
date: 2026-04-13
---

# feat: Webcam session recording

## Overview

Allow logged-in users to record a webcam's HLS stream while they're out on the water, then come back and watch themselves. Recording happens server-side via ffmpeg on a Render Background Worker, with MP4 files stored permanently on Cloudflare R2.

## Problem Statement

Users go wingfoiling/surfing/kitesurfing and want to review their sessions afterward. The webcams are already streaming live — the missing piece is capturing that stream on demand and making it available for later playback.

## Proposed Solution

### Architecture

```
User clicks "Record"
       |
       v
Next.js API route → Convex action (creates recording record)
       |
       v
Render Background Worker picks up job
  - Spawns ffmpeg to remux HLS → MP4 (no re-encoding, -c copy)
  - Monitors progress, updates Convex with status
  - On completion: uploads MP4 to Cloudflare R2
  - Updates recording record with R2 URL + file size
       |
       v
User sees recording in their profile/journal
  - Plays back via R2 public URL or presigned URL
```

### Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Recording location | Server-side (ffmpeg) | Reliable — works when phone is locked, tab is closed, user is in the ocean |
| Storage | Cloudflare R2 | S3-compatible, zero egress fees, cheap ($0.015/GB/mo). Already have rclone configured |
| Retention | Forever | Users own their recordings. No auto-delete |
| Encoding | `-c copy` (remux only) | Near-zero CPU — just repackages HLS segments into MP4 container |
| MP4 format | Fragmented (`frag_keyframe+empty_moov`) | Partial recordings are still playable if ffmpeg crashes mid-recording |
| Max duration | 2 hours | Auto-stop safety net via ffmpeg `-t 7200` flag |

## Technical Approach

### Phase 1: Backend infrastructure

#### 1a. Convex schema — `recordings` table

```typescript
// convex/schema.ts
recordings: defineTable({
    userId: v.id("users"),
    spotId: v.id("spots"),
    status: v.string(),          // "pending" | "recording" | "uploading" | "ready" | "failed"
    startedAt: v.number(),       // epoch ms
    stoppedAt: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    fileSizeBytes: v.optional(v.number()),
    r2Key: v.optional(v.string()),   // R2 object key
    r2Url: v.optional(v.string()),   // Public/presigned playback URL
    streamUrl: v.string(),           // HLS stream URL that was recorded
    errorMessage: v.optional(v.string()),
}).index("by_user", ["userId"])
  .index("by_user_status", ["userId", "status"])
  .index("by_status", ["status"]),
```

#### 1b. Convex mutations/queries

- `recordings.startRecording` — mutation: creates recording record (status: "pending"), returns recording ID
- `recordings.updateStatus` — internal mutation: updates status, duration, file size, R2 URL
- `recordings.stopRecording` — mutation: sets stoppedAt, triggers stop on worker
- `recordings.getMyRecordings` — query: list user's recordings (paginated)
- `recordings.getRecording` — query: get single recording by ID

#### 1c. Next.js API route — `/api/recordings/start`

Receives: `{ spotId, sessionToken }`
- Verifies auth via session token
- Resolves spot's HLS stream URL
- Creates Convex recording record (status: "pending")
- Sends job to background worker (HTTP POST to worker service)
- Returns recording ID

#### 1d. Next.js API route — `/api/recordings/stop`

Receives: `{ recordingId, sessionToken }`
- Verifies auth + ownership
- Sends stop signal to background worker
- Updates Convex record

### Phase 2: Render Background Worker

New Render service: `waterman-recorder` (Background Worker type).

```yaml
# render.yaml addition
- type: worker
  name: waterman-recorder
  env: node
  buildCommand: npm install
  startCommand: node scripts/recorder-worker.mjs
  envVars:
    - key: NEXT_PUBLIC_CONVEX_URL
      sync: false
    - key: CF_ACCOUNT_ID
      sync: false
    - key: R2_ACCESS_KEY_ID
      sync: false
    - key: R2_SECRET_ACCESS_KEY
      sync: false
    - key: R2_BUCKET
      sync: false
```

#### Worker implementation (`scripts/recorder-worker.mjs`)

- Express HTTP server listening for start/stop commands
- Manages ffmpeg child processes (one per active recording)
- Limits concurrent recordings (max 3-5 to avoid disk exhaustion)
- On recording complete: uploads to R2 via `@aws-sdk/lib-storage` multipart upload
- Cleans up local temp files after upload
- Reports status back to Convex via mutations

#### ffmpeg command

```bash
ffmpeg \
  -reconnect 1 \
  -reconnect_at_eof 1 \
  -reconnect_on_network_error 1 \
  -reconnect_delay_max 30 \
  -reconnect_max_retries 10 \
  -rw_timeout 15000000 \
  -i "{HLS_URL}" \
  -c copy \
  -bsf:a aac_adtstoasc \
  -movflags frag_keyframe+empty_moov \
  -t 7200 \
  -y \
  /tmp/recordings/{recording_id}.mp4
```

Key flags:
- `-c copy` — remux only, no re-encoding (near-zero CPU)
- `-reconnect*` — auto-reconnect on transient network failures
- `-rw_timeout 15000000` — 15s read timeout prevents infinite hangs
- `-movflags frag_keyframe+empty_moov` — partial recordings remain playable
- `-t 7200` — hard 2-hour max

#### Graceful stop

Write `'q'` to ffmpeg's stdin to finalize the MP4 cleanly. Force-kill after 30s if it hangs.

#### Stale stream watchdog

If ffmpeg's stderr has no output for 2 minutes, consider the stream dead and stop recording. Upload whatever was captured as a partial recording.

### Phase 3: Upload to Cloudflare R2

```javascript
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

// Multipart upload with 10MB parts, 4 concurrent
const upload = new Upload({
  client: r2,
  params: { Bucket: R2_BUCKET, Key: r2Key, Body: createReadStream(filePath), ContentType: 'video/mp4' },
  partSize: 10 * 1024 * 1024,
  queueSize: 4,
});
```

R2 key format: `recordings/{userId}/{spotId}/{YYYY-MM-DD}/{recordingId}.mp4`

#### File size estimates

| Stream quality | 2-hour file size |
|---|---|
| 720p @ 15fps (typical webcam) | 0.9 - 1.8 GB |
| 720p @ 30fps | 1.8 - 2.7 GB |
| 1080p | 2.7 - 4.5 GB |

Most webcam streams are 720p @ 15fps = ~1-2 GB per 2-hour recording.

### Phase 4: Frontend UI

#### Record button on webcam views

Show a red "Record" button on:
- Cams page (each cam card, for logged-in users)
- Fullscreen webcam view

States:
- **Idle**: Red circle button "Record"
- **Recording**: Pulsing red dot + elapsed timer + "Stop" button
- **Processing**: Spinner + "Uploading..."
- **Done**: Brief "Recorded!" confirmation

#### Recordings list

Add a "My Recordings" section accessible from:
- User profile page
- Journal page (recordings associated with a spot/date could link to journal entries)

Each recording card shows:
- Spot name + thumbnail (first frame or spot image)
- Date + duration
- File size
- Play button → opens video player (R2 URL in a `<video>` tag)
- Download button

### Phase 5: Playback

Simple `<video>` player with the R2 public URL. Since R2 has zero egress fees, direct playback is fine — no need for a CDN or transcoding.

```jsx
<video src={recording.r2Url} controls className="w-full rounded-lg" />
```

## File size & cost estimates

| Recordings/month | Avg size | Monthly storage growth | Monthly R2 cost |
|---|---|---|---|
| 10 | 1.5 GB | 15 GB | $0.23 |
| 50 | 1.5 GB | 75 GB | $1.13 |
| 100 | 1.5 GB | 150 GB | $2.25 |

At $0.015/GB/month, storage is essentially free at current scale. After 1 year of 50 recordings/month: 900 GB = $13.50/month.

## Acceptance Criteria

### Functional
- [ ] Logged-in user can start recording a webcam from the cams page or fullscreen view
- [ ] Recording runs server-side — survives tab close, phone lock, app navigation
- [ ] Recording stops on user request or automatically after 2 hours
- [ ] MP4 file is uploaded to R2 and playable in browser
- [ ] User can view their past recordings in a list
- [ ] User can play back recordings directly in the app
- [ ] Non-logged-in users do not see the record button

### Non-functional
- [ ] ffmpeg uses `-c copy` (no re-encoding) for minimal CPU usage
- [ ] Partial recordings (stream failure, manual stop) are still playable
- [ ] Max 3-5 concurrent recordings per worker instance
- [ ] Local temp files are cleaned up after R2 upload

## Dependencies & Risks

| Risk | Mitigation |
|---|---|
| ffmpeg not available on Render | Verify during worker setup; install via buildCommand if needed |
| Disk space exhaustion from concurrent recordings | Limit concurrent recordings, clean up temp files aggressively |
| HLS stream URLs change or require auth | Stream URLs are already resolved in the app — pass them to the worker |
| R2 upload fails after long recording | Retry upload 3 times; keep local file until confirmed uploaded |
| User starts recording on a spot with no working webcam | Check stream health before starting; return error if stream is down |

## Implementation Order

1. **Phase 1**: Convex schema + mutations (recording records)
2. **Phase 2**: Background worker with ffmpeg + R2 upload
3. **Phase 3**: API routes (start/stop recording)
4. **Phase 4**: Frontend UI (record button + recordings list)
5. **Phase 5**: Playback player

## New dependencies

```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
```

## Sources

- RAD-52: Webcam session recording feature request
- Existing HLS infrastructure: `components/webcam/TvMode.js`, `components/webcam/WebcamFullscreen.js`
- Stream sources: Quanteec (`deliverys5.quanteec.com`) and IOL (direct URLs)
- Render services: `render.yaml`
- Auth system: `convex/auth.ts` (session token verification)
