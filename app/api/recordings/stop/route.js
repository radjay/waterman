import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const WORKER_URL = process.env.RECORDER_WORKER_URL || "http://localhost:4000";
const WORKER_SECRET = process.env.RECORDER_WORKER_SECRET || "";

export async function POST(request) {
    try {
        const { recordingId, sessionToken } = await request.json();

        if (!recordingId || !sessionToken) {
            return Response.json({ error: "Missing recordingId or sessionToken" }, { status: 400 });
        }

        // Stop in Convex (sets stoppedAt, verifies ownership)
        await client.mutation(api.recordings.stopRecording, {
            sessionToken,
            recordingId,
        });

        // Signal the worker to stop ffmpeg gracefully
        try {
            await fetch(`${WORKER_URL}/stop`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${WORKER_SECRET}`,
                },
                body: JSON.stringify({ recordingId }),
            });
        } catch (workerErr) {
            // Worker might be down — recording will auto-stop at max duration
            console.warn("Could not reach worker to stop recording:", workerErr.message);
        }

        return Response.json({ status: "stopping" });
    } catch (err) {
        console.error("Stop recording error:", err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}
