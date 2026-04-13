import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const WORKER_URL = process.env.RECORDER_WORKER_URL || "http://localhost:4000";
const WORKER_SECRET = process.env.RECORDER_WORKER_SECRET || "";

export async function POST(request) {
    try {
        const { spotId, sessionToken } = await request.json();

        if (!spotId || !sessionToken) {
            return Response.json({ error: "Missing spotId or sessionToken" }, { status: 400 });
        }

        // Get spot to resolve stream URL
        const spot = await client.query(api.spots.getSpotById, { spotId });
        if (!spot) {
            return Response.json({ error: "Spot not found" }, { status: 404 });
        }

        // Resolve HLS stream URL
        let streamUrl = null;
        if (spot.webcamStreamId) {
            if (spot.webcamStreamSource === "quanteec") {
                streamUrl = `https://deliverys5.quanteec.com/contents/encodings/live/${spot.webcamStreamId}/media_0.m3u8`;
            } else if (spot.webcamStreamSource === "iol") {
                streamUrl = spot.webcamStreamId;
            }
        } else if (spot.webcamUrl) {
            streamUrl = spot.webcamUrl;
        }

        if (!streamUrl) {
            return Response.json({ error: "No webcam stream available for this spot" }, { status: 400 });
        }

        // Create recording record in Convex
        const recordingId = await client.mutation(api.recordings.startRecording, {
            sessionToken,
            spotId,
            streamUrl,
        });

        // Trigger the worker to start recording
        try {
            const workerRes = await fetch(`${WORKER_URL}/start`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${WORKER_SECRET}`,
                },
                body: JSON.stringify({ recordingId, streamUrl }),
            });

            if (!workerRes.ok) {
                const err = await workerRes.json().catch(() => ({}));
                throw new Error(err.error || `Worker returned ${workerRes.status}`);
            }
        } catch (workerErr) {
            // Worker failed to start — mark recording as failed
            await client.mutation(api.recordings.updateStatus, {
                recordingId,
                status: "failed",
                errorMessage: `Worker unavailable: ${workerErr.message}`,
                stoppedAt: Date.now(),
            });
            return Response.json({ error: "Recording service unavailable" }, { status: 503 });
        }

        return Response.json({ recordingId, status: "started" });
    } catch (err) {
        console.error("Start recording error:", err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}
