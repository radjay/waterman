import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Start a new recording — creates a "pending" record.
 * Called from the API route after auth verification.
 */
export const startRecording = mutation({
    args: {
        sessionToken: v.string(),
        spotId: v.id("spots"),
        streamUrl: v.string(),
    },
    handler: async (ctx, args) => {
        // Verify session
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .first();

        if (!session || Date.now() > session.expiresAt) {
            throw new Error("Unauthorized");
        }

        // Check for existing active recording by this user
        const active = await ctx.db
            .query("recordings")
            .withIndex("by_user_status", (q) =>
                q.eq("userId", session.userId).eq("status", "recording")
            )
            .first();

        if (active) {
            throw new Error("You already have an active recording. Stop it before starting a new one.");
        }

        const recordingId = await ctx.db.insert("recordings", {
            userId: session.userId,
            spotId: args.spotId,
            status: "pending",
            startedAt: Date.now(),
            streamUrl: args.streamUrl,
        });

        return recordingId;
    },
});

/**
 * Update recording status — called by the worker service.
 * Uses a shared secret for auth since the worker is an external process.
 */
export const updateStatus = mutation({
    args: {
        recordingId: v.id("recordings"),
        status: v.string(),
        durationSeconds: v.optional(v.number()),
        fileSizeBytes: v.optional(v.number()),
        r2Key: v.optional(v.string()),
        r2Url: v.optional(v.string()),
        stoppedAt: v.optional(v.number()),
        errorMessage: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { recordingId, ...fields } = args;
        // Remove undefined fields
        const updates: Record<string, any> = {};
        for (const [key, value] of Object.entries(fields)) {
            if (value !== undefined) updates[key] = value;
        }
        await ctx.db.patch(recordingId, updates);
    },
});

/**
 * Stop a recording — sets stoppedAt timestamp.
 * The worker polls for this and sends SIGTERM to ffmpeg.
 */
export const stopRecording = mutation({
    args: {
        sessionToken: v.string(),
        recordingId: v.id("recordings"),
    },
    handler: async (ctx, args) => {
        // Verify session
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .first();

        if (!session || Date.now() > session.expiresAt) {
            throw new Error("Unauthorized");
        }

        const recording = await ctx.db.get(args.recordingId);
        if (!recording) throw new Error("Recording not found");
        if (recording.userId !== session.userId) throw new Error("Not your recording");
        if (recording.status !== "recording" && recording.status !== "pending") {
            throw new Error("Recording is not active");
        }

        await ctx.db.patch(args.recordingId, {
            stoppedAt: Date.now(),
        });

        return { success: true };
    },
});

/**
 * Get the current user's recordings, most recent first.
 */
export const getMyRecordings = query({
    args: {
        sessionToken: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .first();

        if (!session || Date.now() > session.expiresAt) {
            return [];
        }

        const recordings = await ctx.db
            .query("recordings")
            .withIndex("by_user", (q) => q.eq("userId", session.userId))
            .order("desc")
            .take(args.limit ?? 50);

        // Enrich with spot names
        const enriched = await Promise.all(
            recordings.map(async (rec) => {
                const spot = await ctx.db.get(rec.spotId);
                return { ...rec, spotName: spot?.name ?? "Unknown spot" };
            })
        );

        return enriched;
    },
});

/**
 * Get a single recording by ID.
 */
export const getRecording = query({
    args: {
        recordingId: v.id("recordings"),
    },
    handler: async (ctx, args) => {
        const recording = await ctx.db.get(args.recordingId);
        if (!recording) return null;

        const spot = await ctx.db.get(recording.spotId);
        return { ...recording, spotName: spot?.name ?? "Unknown spot" };
    },
});

/**
 * Get the user's currently active recording (if any).
 */
export const getActiveRecording = query({
    args: {
        sessionToken: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .first();

        if (!session || Date.now() > session.expiresAt) {
            return null;
        }

        const active = await ctx.db
            .query("recordings")
            .withIndex("by_user_status", (q) =>
                q.eq("userId", session.userId).eq("status", "recording")
            )
            .first();

        if (!active) {
            // Also check pending
            const pending = await ctx.db
                .query("recordings")
                .withIndex("by_user_status", (q) =>
                    q.eq("userId", session.userId).eq("status", "pending")
                )
                .first();
            return pending ?? null;
        }

        return active;
    },
});
