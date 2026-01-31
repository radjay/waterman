# PRD 08: Scoring Debug Page & LLM Provenance Tracking

**Version**: 1.0  
**Date**: 2026-01-30  
**Status**: Draft

## Problem Statement

Users occasionally see strange scores from the LLM scoring system. When reading the reasoning, something seems off but there's no way to:

1. **Debug interactively**: View all slots for a specific spot/sport/user combination with their scores and reasoning side-by-side with weather data
2. **Trace provenance**: See exactly what prompt was sent to the LLM and what response was received

Without full prompt/response logging, diagnosing scoring issues requires manual investigation, re-running prompts, and guessing what context was provided.

## Goals

1. **Admin Debug Page**: Create an interactive admin page to explore scoring results with full context
2. **Provenance Tracking**: Store complete prompt/response pairs for every LLM scoring call
3. **Traceability**: Link scores to their provenance records for one-click debugging

## Non-Goals

- Automated anomaly detection
- Score editing/override from admin UI
- Historical trend analysis
- Public-facing debugging tools

---

## Part I: Admin Scoring Debug Page

### User Flow

1. Admin navigates to `/admin/scoring-debug`
2. Selects **sport** (wingfoil, surfing)
3. Selects **spot** from dropdown
4. Optionally selects **user** (or leaves as "System" for default scores)
5. Page displays:
   - Forecast slots grouped by day (similar to main app)
   - Under each slot: weather data, score, reasoning
   - Link to full provenance (prompt + response)

### UI Design

```
┌─────────────────────────────────────────────────────────────────┐
│  Scoring Debug                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Sport: [Wingfoil ▼]  Spot: [Carcavelos ▼]  User: [System ▼]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Friday, Jan 31                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 09:00                                                       ││
│  │ Wind: 18kts ↗ NW (315°)  Gust: 22kts                       ││
│  │ Waves: 1.2m @ 12s ↗ NW                                     ││
│  │ ────────────────────────────────────────────────────────── ││
│  │ Score: 78  |  ★ Ideal                                      ││
│  │ Reasoning: Good wind speed with consistent direction.      ││
│  │            Moderate waves provide good riding conditions.  ││
│  │ [View Full Prompt & Response]                              ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 12:00                                                       ││
│  │ Wind: 14kts ↗ NW (320°)  Gust: 18kts                       ││
│  │ ...                                                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Saturday, Feb 1                                                │
│  ...                                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Provenance Modal

When clicking "View Full Prompt & Response", show a modal with:

```
┌─────────────────────────────────────────────────────────────────┐
│  Scoring Provenance - Carcavelos, Jan 31 09:00                  │
├─────────────────────────────────────────────────────────────────┤
│  SYSTEM PROMPT                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ You are an expert wingfoiling condition evaluator...        ││
│  │ Spot: Carcavelos                                           ││
│  │ This spot works best with NW wind...                       ││
│  │ Consider trends in conditions 72 hours before...           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  USER PROMPT                                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Evaluate these conditions:                                  ││
│  │ Current: 09:00 Jan 31 - 18kts NW (315°) gusting 22kts      ││
│  │ Historical context (72h before):                           ││
│  │   -72h: 12kts NW (310°) gusting 15kts                      ││
│  │   ...                                                      ││
│  │ Provide a JSON response with...                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  RAW RESPONSE                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ {"score": 78, "reasoning": "Good wind speed...",           ││
│  │  "factors": {"windQuality": 82, ...}}                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Metadata                                                       │
│  Model: openai/gpt-oss-120b                                     │
│  Scored at: Jan 31, 2026 05:30:00 UTC                          │
│  Temperature: 0.3                                               │
│  Max tokens: 800                                                │
│                                                  [Close]        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part II: Provenance Tracking

### New Table: `scoring_logs`

Store complete request/response pairs for every LLM scoring call.

```typescript
scoring_logs: defineTable({
    // Link to the score
    scoreId: v.id("condition_scores"),
    
    // Context identifiers
    slotId: v.id("forecast_slots"),
    spotId: v.id("spots"),
    sport: v.string(),
    userId: v.union(v.string(), v.null()), // null = system score
    timestamp: v.number(), // Slot timestamp for easy querying
    
    // Request data
    systemPrompt: v.string(), // Full constructed system prompt
    userPrompt: v.string(),   // Full constructed user prompt
    model: v.string(),        // e.g., "openai/gpt-oss-120b"
    temperature: v.number(),  // e.g., 0.3
    maxTokens: v.number(),    // e.g., 800
    
    // Response data
    rawResponse: v.string(),  // Raw JSON string from LLM
    
    // Metadata
    scoredAt: v.number(),     // When scoring occurred
    durationMs: v.optional(v.number()), // How long the API call took
    attempt: v.optional(v.number()),    // Which retry attempt succeeded (1-based)
})
    .index("by_score", ["scoreId"])
    .index("by_slot_sport", ["slotId", "sport"])
    .index("by_spot_timestamp_sport", ["spotId", "timestamp", "sport"])
    .index("by_user_spot_sport", ["userId", "spotId", "sport"])
```

### Integration Points

1. **`scoreSingleSlot` action** (`convex/spots.ts`):
   - After successful API call, save to `scoring_logs` before calling `saveConditionScore`
   - Track duration and retry attempt number

2. **`scorePersonalizedSlot` action** (`convex/personalization.ts`):
   - Same integration for personalized scoring

3. **New mutation: `saveScoringLog`** (`convex/admin.ts`):
   - Internal mutation to persist scoring logs
   - Called from actions after successful LLM response

### Data Flow

```
scoreSingleSlot action
    │
    ├─► Build prompts (system + user)
    │
    ├─► Call Groq API (with retries)
    │
    ├─► Parse response
    │
    ├─► Call saveScoringLog (new)
    │       └─► Insert into scoring_logs
    │
    └─► Call saveConditionScore
            └─► Insert into condition_scores (with scoring_log reference)
```

---

## API Design

### New Queries

**`admin.getScoringDebugData`**
```typescript
args: {
    sessionToken: v.string(),
    spotId: v.id("spots"),
    sport: v.string(),
    userId: v.union(v.string(), v.null()), // null = system scores
}
returns: Array of {
    slot: forecast slot data,
    score: condition score data,
    scoringLogId: Id<"scoring_logs"> | null
}
```

**`admin.getScoringLog`**
```typescript
args: {
    sessionToken: v.string(),
    scoringLogId: v.id("scoring_logs"),
}
returns: Full scoring log with prompts and response
```

### New Mutations

**`admin.saveScoringLog`** (internal)
```typescript
args: {
    scoreId: v.id("condition_scores"),
    slotId: v.id("forecast_slots"),
    spotId: v.id("spots"),
    sport: v.string(),
    userId: v.union(v.string(), v.null()),
    timestamp: v.number(),
    systemPrompt: v.string(),
    userPrompt: v.string(),
    model: v.string(),
    temperature: v.number(),
    maxTokens: v.number(),
    rawResponse: v.string(),
    scoredAt: v.number(),
    durationMs: v.optional(v.number()),
    attempt: v.optional(v.number()),
}
```

---

## Implementation Plan

### Phase 1: Database Schema
1. Add `scoring_logs` table to schema
2. Deploy schema update

### Phase 2: Backend - Provenance Tracking
1. Create `saveScoringLog` mutation
2. Modify `scoreSingleSlot` to capture prompts and call `saveScoringLog`
3. Modify `scorePersonalizedSlot` similarly
4. Add `getScoringLog` and `getScoringDebugData` queries

### Phase 3: Admin UI
1. Create `/admin/scoring-debug/page.js`
2. Build sport/spot/user selector UI
3. Display slots with weather + score + reasoning
4. Add provenance modal with full prompt/response display

### Phase 4: Testing
1. Trigger new scrape to generate new scoring logs
2. Verify provenance data is captured correctly
3. Test admin UI with real data

---

## Data Migration

No migration needed - the `scoring_logs` table will only contain data for scores generated after deployment. Historical scores won't have provenance records, which is acceptable since:

1. The main purpose is debugging future issues
2. Old scores can be re-generated if needed to create provenance

---

## Considerations

### Storage Growth

Each scoring log stores ~4-8KB (prompts + response). With ~1000 slots/week * 2 sports:
- ~16MB/week growth
- ~800MB/year

This is acceptable for a debugging tool. Can add TTL cleanup later if needed.

### Performance

- Debug queries are admin-only, low frequency
- Indexes support efficient lookups by score ID
- No impact on production scoring performance (async log write)

### Privacy

- No user PII in prompts (skill level is anonymized)
- Admin-only access with session validation
- Logs capture scoring context, not personal data

---

## Success Metrics

1. **Debug efficiency**: Can identify prompt/response issues within 1 minute
2. **Coverage**: 100% of new scores have provenance records
3. **Reliability**: Admin page loads in <2s with full slot list

---

## Open Questions

1. **Log retention**: How long to keep scoring logs? (Propose: 90 days)
2. **Export**: Should we support exporting problematic prompt/response pairs for analysis?

---

## References

- Current scoring: `convex/spots.ts` (scoreSingleSlot action)
- Prompt building: `convex/prompts.ts` (buildPrompt function)
- Admin pages: `app/admin/`
- Schema: `convex/schema.ts`
