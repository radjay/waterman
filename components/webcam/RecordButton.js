"use client";

import { useState, useEffect, useRef } from "react";
import { Circle, Square } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

/**
 * RecordButton — starts/stops webcam recording for logged-in users.
 *
 * @param {string} spotId - The spot to record
 * @param {string} className - Additional CSS classes
 */
export function RecordButton({ spotId, className = "" }) {
    const { isAuthenticated, sessionToken } = useAuth();
    const [status, setStatus] = useState("idle"); // idle | starting | recording | stopping
    const [recordingId, setRecordingId] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    const timerRef = useRef(null);

    // Check for active recording on mount
    useEffect(() => {
        if (!isAuthenticated || !sessionToken) return;

        async function checkActive() {
            try {
                const active = await client.query(api.recordings.getActiveRecording, { sessionToken });
                if (active && active.spotId === spotId) {
                    setRecordingId(active._id);
                    setStatus(active.status === "pending" ? "starting" : "recording");
                    setElapsed(Math.round((Date.now() - active.startedAt) / 1000));
                }
            } catch {}
        }
        checkActive();
    }, [isAuthenticated, sessionToken, spotId]);

    // Elapsed timer
    useEffect(() => {
        if (status === "recording") {
            timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
            return () => clearInterval(timerRef.current);
        } else {
            clearInterval(timerRef.current);
        }
    }, [status]);

    if (!isAuthenticated) return null;

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const handleStart = async () => {
        setStatus("starting");
        try {
            const res = await fetch("/api/recordings/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ spotId, sessionToken }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setRecordingId(data.recordingId);
            setStatus("recording");
            setElapsed(0);
        } catch (err) {
            console.error("Failed to start recording:", err);
            setStatus("idle");
        }
    };

    const handleStop = async () => {
        setStatus("stopping");
        try {
            await fetch("/api/recordings/stop", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recordingId, sessionToken }),
            });
            setStatus("idle");
            setRecordingId(null);
            setElapsed(0);
        } catch (err) {
            console.error("Failed to stop recording:", err);
            setStatus("recording"); // Revert to recording state
        }
    };

    if (status === "idle") {
        return (
            <button
                onClick={(e) => { e.stopPropagation(); handleStart(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-semibold uppercase tracking-wider hover:bg-red-700 active:scale-[0.98] transition-all ${className}`}
                aria-label="Start recording"
            >
                <Circle size={10} fill="currentColor" />
                Record
            </button>
        );
    }

    if (status === "starting") {
        return (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600/70 text-white text-xs font-semibold uppercase tracking-wider ${className}`}>
                <span className="animate-pulse">Starting...</span>
            </div>
        );
    }

    if (status === "recording") {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600/10 text-red-700 text-xs font-bold tabular-nums">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
                    </span>
                    {formatTime(elapsed)}
                </span>
                <button
                    onClick={(e) => { e.stopPropagation(); handleStop(); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-ink/10 text-ink text-xs font-semibold uppercase tracking-wider hover:bg-ink/20 active:scale-[0.98] transition-all"
                    aria-label="Stop recording"
                >
                    <Square size={10} fill="currentColor" />
                    Stop
                </button>
            </div>
        );
    }

    // stopping
    return (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink/10 text-faded-ink text-xs font-semibold uppercase tracking-wider ${className}`}>
            <span className="animate-pulse">Saving...</span>
        </div>
    );
}
