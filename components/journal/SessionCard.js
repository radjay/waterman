"use client";

import { MapPin, Clock, Star, BookOpen } from "lucide-react";
import { RatingDisplay } from "./RatingInput";
import { DurationDisplay } from "./DurationInput";
import { useRouter } from "next/navigation";

export function SessionCard({ entry }) {
  const router = useRouter();

  const locationName = entry.spotName || entry.customLocation || "Unknown";
  const sessionDate = new Date(entry.sessionDate);
  const dateStr = sessionDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sessionDate.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
  const timeStr = sessionDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const sportLabel = entry.sport === "wingfoil" ? "Wing" : entry.sport === "kitesurfing" ? "Kite" : "Surf";

  return (
    <button
      onClick={() => router.push(`/journal/${entry._id}`)}
      className="w-full p-4 rounded border border-ink/20 hover:border-ink/30 hover:bg-ink/5 transition-all text-left bg-newsprint"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-ink/10 text-ink text-xs font-medium rounded">
              {sportLabel}
            </span>
            {entry.hasForecastData && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                Forecast
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-ink/70">
            <MapPin className="w-4 h-4" />
            <span className="font-medium">{locationName}</span>
          </div>

          <div className="flex items-center gap-4 text-sm text-ink/60">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>
                {dateStr} at {timeStr}
              </span>
            </div>
            <DurationDisplay minutes={entry.durationMinutes} />
          </div>

          <div className="flex items-center gap-2">
            <RatingDisplay value={entry.rating} />
          </div>

          {entry.sessionNotes && (
            <div className="text-sm text-ink/70 line-clamp-2 mt-2">
              {entry.sessionNotes}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
