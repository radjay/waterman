"use client";

import { useState, useEffect } from "react";
import { Wind } from "lucide-react";

/**
 * LiveWindRow component displays real-time wind data as a compact pill.
 * Shows wind speed, gusts, and direction inline with forecast data.
 *
 * @param {string} stationId - Windguru station ID
 * @param {string} className - Additional CSS classes
 */
export function LiveWindRow({ stationId, href, className = "" }) {
  const [liveWind, setLiveWind] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!stationId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchLiveWind() {
      try {
        const response = await fetch(`/api/live-wind/${stationId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch live wind data");
        }
        const data = await response.json();
        if (isMounted) {
          setLiveWind(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          console.error("Live wind fetch error:", err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchLiveWind();

    // Refresh every 2 minutes
    const interval = setInterval(fetchLiveWind, 2 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [stationId]);

  if (loading || error || !liveWind || !Number.isFinite(liveWind.windSpeedKnots)) {
    return null;
  }

  // Calculate how old the data is
  const ageMinutes = Math.floor((Date.now() - liveWind.timestamp) / (60 * 1000));
  const isStale = ageMinutes > 15; // Consider stale if older than 15 minutes

  const pill = (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${
        isStale
          ? "bg-ink/[0.04] text-faded-ink"
          : "bg-green-50 text-green-800"
      } ${href ? "cursor-pointer hover:brightness-95 transition-all" : ""} ${className}`}
    >
        {/* Pulsing dot */}
        {!isStale && (
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
          </span>
        )}

        <span className={`text-[0.65rem] font-bold uppercase tracking-wider ${isStale ? "text-faded-ink" : "text-green-700"}`}>
          Live
        </span>

        <Wind size={12} className={isStale ? "text-faded-ink/50" : "text-green-600"} />

        <span className={`text-sm font-bold tabular-nums ${isStale ? "text-faded-ink" : "text-green-900"}`}>
          {Math.round(liveWind.windSpeedKnots)}
        </span>

        <span className={`text-[0.65rem] font-medium ${isStale ? "text-faded-ink/70" : "text-green-700"}`}>
          kn
        </span>

        {Number.isFinite(liveWind.windGustKnots) && (
          <span className={`text-[0.65rem] tabular-nums ${isStale ? "text-faded-ink/50" : "text-green-600"}`}>
            ({Math.round(liveWind.windGustKnots)})
          </span>
        )}

        {/* Age indicator */}
        {ageMinutes > 0 && (
          <span className={`text-[0.6rem] ${isStale ? "text-faded-ink/40" : "text-green-600/70"}`}>
            {ageMinutes}m
          </span>
        )}
      </div>
  );

  return (
    <div className="py-2">
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {pill}
        </a>
      ) : (
        pill
      )}
    </div>
  );
}
