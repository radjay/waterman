"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { Heading } from "../../components/ui/Heading";
import { Text } from "../../components/ui/Text";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../components/auth/AuthProvider";
import { Video, Clock, HardDrive, Play, Download } from "lucide-react";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

function formatDuration(seconds) {
    if (!seconds) return "—";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
}

function formatFileSize(bytes) {
    if (!bytes) return "—";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

const STATUS_LABELS = {
    pending: "Starting...",
    recording: "Recording",
    uploading: "Uploading...",
    ready: "Ready",
    failed: "Failed",
};

const STATUS_COLORS = {
    pending: "text-amber-600 bg-amber-50",
    recording: "text-red-600 bg-red-50",
    uploading: "text-blue-600 bg-blue-50",
    ready: "text-green-700 bg-green-50",
    failed: "text-red-700 bg-red-50",
};

export default function RecordingsPage() {
    const { isAuthenticated, sessionToken, loading: authLoading } = useAuth();
    const router = useRouter();
    const [recordings, setRecordings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [playingId, setPlayingId] = useState(null);

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated || !sessionToken) {
            router.push("/auth/login");
            return;
        }

        async function fetchRecordings() {
            try {
                const data = await client.query(api.recordings.getMyRecordings, { sessionToken });
                setRecordings(data);
            } catch (err) {
                console.error("Failed to fetch recordings:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchRecordings();
    }, [isAuthenticated, sessionToken, authLoading, router]);

    if (authLoading || loading) {
        return (
            <MainLayout>
                <Header />
                <div className="flex justify-center py-20">
                    <Text variant="muted">Loading...</Text>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <Header />
            <div className="pt-4 pb-12">
                <Heading level={1} className="mb-6">My Recordings</Heading>

                {recordings.length === 0 ? (
                    <div className="text-center py-16">
                        <Video className="w-12 h-12 mx-auto mb-4 text-faded-ink/30" />
                        <Heading level={3} className="mb-2">No recordings yet</Heading>
                        <Text variant="muted">
                            Go to a webcam and hit Record to capture your session.
                        </Text>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {recordings.map((rec) => (
                            <Card key={rec._id} className="p-4">
                                {/* Header row */}
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <Text variant="body" className="font-semibold">{rec.spotName}</Text>
                                        <Text variant="muted" className="text-xs">{formatDate(rec.startedAt)}</Text>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase tracking-wider ${STATUS_COLORS[rec.status] || "text-faded-ink bg-ink/5"}`}>
                                        {STATUS_LABELS[rec.status] || rec.status}
                                    </span>
                                </div>

                                {/* Metadata */}
                                <div className="flex items-center gap-4 text-xs text-faded-ink mb-3">
                                    <span className="flex items-center gap-1">
                                        <Clock size={12} />
                                        {formatDuration(rec.durationSeconds)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <HardDrive size={12} />
                                        {formatFileSize(rec.fileSizeBytes)}
                                    </span>
                                </div>

                                {/* Video player */}
                                {rec.status === "ready" && rec.r2Url && (
                                    <>
                                        {playingId === rec._id ? (
                                            <video
                                                src={rec.r2Url}
                                                controls
                                                autoPlay
                                                className="w-full rounded-lg mt-2"
                                            />
                                        ) : (
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    onClick={() => setPlayingId(rec._id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink/10 text-ink text-xs font-semibold uppercase tracking-wider hover:bg-ink/20 transition-colors"
                                                >
                                                    <Play size={12} fill="currentColor" />
                                                    Play
                                                </button>
                                                <a
                                                    href={rec.r2Url}
                                                    download
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink/5 text-faded-ink text-xs font-semibold uppercase tracking-wider hover:bg-ink/10 transition-colors"
                                                >
                                                    <Download size={12} />
                                                    Download
                                                </a>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Error message */}
                                {rec.status === "failed" && rec.errorMessage && (
                                    <Text variant="muted" className="text-xs text-red-600 mt-2">
                                        {rec.errorMessage}
                                    </Text>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
