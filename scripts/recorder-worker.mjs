/**
 * Webcam Recording Worker
 *
 * Standalone Express server that manages ffmpeg recording jobs.
 * Receives start/stop commands via HTTP, spawns ffmpeg to remux HLS→MP4,
 * uploads completed recordings to Cloudflare R2, and reports status to Convex.
 *
 * Deployed as a Render Background Worker.
 */

import express from "express";
import { spawn } from "node:child_process";
import { createReadStream, statSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

// ── Config ──────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4000;
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_RECORDINGS || "5");
const MAX_DURATION = parseInt(process.env.MAX_RECORDING_DURATION || "7200"); // 2 hours
const RECORDINGS_DIR = "/tmp/recordings";
const WORKER_SECRET = process.env.RECORDER_WORKER_SECRET || "";

// Ensure recordings directory exists
if (!existsSync(RECORDINGS_DIR)) mkdirSync(RECORDINGS_DIR, { recursive: true });

// ── Clients ─────────────────────────────────────────────────────────────────

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const R2_BUCKET = process.env.R2_BUCKET || "waterman-recordings";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || ""; // e.g., https://recordings.watermanreport.com

// ── Active recordings tracker ───────────────────────────────────────────────

const activeRecordings = new Map(); // recordingId → { process, outputPath, startTime }

// ── Express server ──────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// Auth middleware
function requireSecret(req, res, next) {
    const auth = req.headers.authorization;
    if (!WORKER_SECRET || auth === `Bearer ${WORKER_SECRET}`) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
}

// Health check
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        activeRecordings: activeRecordings.size,
        maxConcurrent: MAX_CONCURRENT,
    });
});

// Start recording
app.post("/start", requireSecret, async (req, res) => {
    const { recordingId, streamUrl } = req.body;

    if (!recordingId || !streamUrl) {
        return res.status(400).json({ error: "Missing recordingId or streamUrl" });
    }

    if (activeRecordings.size >= MAX_CONCURRENT) {
        return res.status(429).json({ error: "Max concurrent recordings reached" });
    }

    if (activeRecordings.has(recordingId)) {
        return res.status(409).json({ error: "Recording already active" });
    }

    try {
        await startRecording(recordingId, streamUrl);
        res.json({ status: "started", recordingId });
    } catch (err) {
        console.error(`Failed to start recording ${recordingId}:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

// Stop recording
app.post("/stop", requireSecret, async (req, res) => {
    const { recordingId } = req.body;

    if (!recordingId) {
        return res.status(400).json({ error: "Missing recordingId" });
    }

    const recording = activeRecordings.get(recordingId);
    if (!recording) {
        return res.status(404).json({ error: "Recording not found or already stopped" });
    }

    stopRecording(recordingId);
    res.json({ status: "stopping", recordingId });
});

// List active recordings
app.get("/active", requireSecret, (req, res) => {
    const list = [];
    for (const [id, rec] of activeRecordings) {
        list.push({
            recordingId: id,
            startTime: rec.startTime,
            elapsedSeconds: Math.round((Date.now() - rec.startTime) / 1000),
        });
    }
    res.json(list);
});

app.listen(PORT, () => {
    console.log(`Recorder worker listening on port ${PORT}`);
    console.log(`Max concurrent recordings: ${MAX_CONCURRENT}`);
});

// ── Recording logic ─────────────────────────────────────────────────────────

async function startRecording(recordingId, streamUrl) {
    const outputPath = `${RECORDINGS_DIR}/${recordingId}.mp4`;

    const args = [
        "-i", streamUrl,
        "-c", "copy",
        "-movflags", "frag_keyframe+empty_moov",
        "-t", String(MAX_DURATION),
        "-y",
        outputPath,
    ];

    console.log(`Starting recording ${recordingId}: ${streamUrl}`);
    const proc = spawn("ffmpeg", args, { stdio: ["pipe", "pipe", "pipe"] });

    const rec = {
        process: proc,
        outputPath,
        startTime: Date.now(),
        killed: false,
        lastActivity: Date.now(),
    };
    activeRecordings.set(recordingId, rec);

    // Update Convex status to "recording"
    await updateConvexStatus(recordingId, { status: "recording" });

    // Monitor stderr for progress and log errors
    let lastStderr = "";
    proc.stderr.on("data", (chunk) => {
        rec.lastActivity = Date.now();
        lastStderr = chunk.toString();
        // Log ffmpeg errors (not routine progress)
        if (lastStderr.includes("Error") || lastStderr.includes("error")) {
            console.error(`Recording ${recordingId} ffmpeg:`, lastStderr.trim());
        }
    });

    // Stale stream watchdog — if no stderr for 2 minutes, stop
    const watchdog = setInterval(() => {
        if (Date.now() - rec.lastActivity > 120_000) {
            console.warn(`Recording ${recordingId}: stream appears stale, stopping`);
            clearInterval(watchdog);
            stopRecording(recordingId);
        }
    }, 30_000);

    // Handle process exit
    proc.on("close", async (code, signal) => {
        clearInterval(watchdog);
        activeRecordings.delete(recordingId);

        const elapsedSeconds = Math.round((Date.now() - rec.startTime) / 1000);
        console.log(`Recording ${recordingId} ended: code=${code}, signal=${signal}, elapsed=${elapsedSeconds}s`);

        // Upload to R2 if we have a file
        if (existsSync(outputPath)) {
            const fileSize = statSync(outputPath).size;

            if (fileSize > 100_000) { // At least 100KB
                try {
                    await updateConvexStatus(recordingId, { status: "uploading" });
                    const r2Key = await uploadToR2(recordingId, outputPath);
                    const r2Url = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${r2Key}` : r2Key;

                    await updateConvexStatus(recordingId, {
                        status: "ready",
                        durationSeconds: elapsedSeconds,
                        fileSizeBytes: fileSize,
                        r2Key,
                        r2Url,
                        stoppedAt: Date.now(),
                    });
                    console.log(`Recording ${recordingId}: uploaded to R2 (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);
                } catch (uploadErr) {
                    console.error(`Recording ${recordingId}: upload failed:`, uploadErr.message);
                    await updateConvexStatus(recordingId, {
                        status: "failed",
                        errorMessage: `Upload failed: ${uploadErr.message}`,
                        stoppedAt: Date.now(),
                        durationSeconds: elapsedSeconds,
                    });
                }
            } else {
                console.log(`Recording ${recordingId}: file too small (${fileSize} bytes), discarding`);
                await updateConvexStatus(recordingId, {
                    status: "failed",
                    errorMessage: "Recording too short or stream unavailable",
                    stoppedAt: Date.now(),
                });
            }

            // Clean up local file
            try { unlinkSync(outputPath); } catch {}
        } else {
            await updateConvexStatus(recordingId, {
                status: "failed",
                errorMessage: "No output file produced",
                stoppedAt: Date.now(),
            });
        }
    });

    proc.on("error", async (err) => {
        clearInterval(watchdog);
        activeRecordings.delete(recordingId);
        console.error(`Recording ${recordingId}: ffmpeg error:`, err.message);
        await updateConvexStatus(recordingId, {
            status: "failed",
            errorMessage: err.message,
            stoppedAt: Date.now(),
        });
    });
}

function stopRecording(recordingId) {
    const rec = activeRecordings.get(recordingId);
    if (!rec || rec.killed) return;

    rec.killed = true;
    console.log(`Stopping recording ${recordingId}`);

    // Graceful: send 'q' to ffmpeg stdin to finalize the MP4
    rec.process.stdin.write("q");
    rec.process.stdin.end();

    // Force kill after 30s if graceful shutdown hangs
    setTimeout(() => {
        if (rec.process && !rec.process.killed) {
            console.warn(`Recording ${recordingId}: force killing ffmpeg`);
            rec.process.kill("SIGKILL");
        }
    }, 30_000);
}

// ── R2 upload ───────────────────────────────────────────────────────────────

async function uploadToR2(recordingId, filePath) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const r2Key = `recordings/${dateStr}/${recordingId}.mp4`;

    const fileSize = statSync(filePath).size;
    console.log(`Uploading ${(fileSize / 1024 / 1024).toFixed(1)} MB to R2: ${r2Key}`);

    const upload = new Upload({
        client: r2,
        params: {
            Bucket: R2_BUCKET,
            Key: r2Key,
            Body: createReadStream(filePath),
            ContentType: "video/mp4",
        },
        partSize: 10 * 1024 * 1024, // 10 MB parts
        queueSize: 4,
        leavePartsOnError: false,
    });

    await upload.done();
    console.log(`Upload complete: ${r2Key}`);
    return r2Key;
}

// ── Convex helpers ──────────────────────────────────────────────────────────

async function updateConvexStatus(recordingId, fields) {
    try {
        await convex.mutation(api.recordings.updateStatus, {
            recordingId,
            ...fields,
        });
    } catch (err) {
        console.error(`Failed to update Convex status for ${recordingId}:`, err.message);
    }
}
