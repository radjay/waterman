"use client";

import { useState, useEffect } from "react";
import { Wind } from "lucide-react";

/**
 * LiveWindRow component displays real-time wind data as a forecast-like row.
 * Shows wind speed, gusts, and direction in the same style as forecast slots.
 *
 * @param {string} stationId - Windguru station ID
 * @param {string} className - Additional CSS classes
 */
export function LiveWindRow({ stationId, className = "" }) {
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

  if (loading || error || !liveWind || liveWind.windSpeedKnots === null) {
    return null;
  }

  // Calculate how old the data is
  const ageMinutes = Math.floor((Date.now() - liveWind.timestamp) / (60 * 1000));
  const isStale = ageMinutes > 15; // Consider stale if older than 15 minutes

  return (
    <div className="py-2 px-2">
      <div
        className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-lg border-2 ${
          isStale
            ? "border-ink/20 bg-ink/5"
            : "border-green-600 bg-gradient-to-r from-green-50 to-green-100"
        } ${className}`}
      >
        {/* Live indicator with pulsing dot */}
        <div className="flex items-center gap-2">
          {!isStale && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-600 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-600"></span>
            </span>
          )}
          <span className={`text-sm font-bold uppercase tracking-wide ${isStale ? "text-ink/60" : "text-green-700"}`}>
            Live Now
          </span>
        </div>

        {/* Wind icon and data - prominent */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-white/60">
          <Wind size={18} className={isStale ? "text-ink/40" : "text-green-700"} />
          <span className={`text-lg font-bold tabular-nums ${isStale ? "text-ink/60" : "text-green-900"}`}>
            {Math.round(liveWind.windSpeedKnots)}
          </span>
          <span className={`text-sm font-medium ${isStale ? "text-ink/50" : "text-green-800"}`}>
            kn
          </span>
          {liveWind.windGustKnots !== null && (
            <span className={`text-sm tabular-nums ${isStale ? "text-ink/40" : "text-green-700"}`}>
              ({Math.round(liveWind.windGustKnots)}*)
            </span>
          )}
        </div>

        {/* Age indicator */}
        {ageMinutes > 0 && (
          <div className={`text-xs ${isStale ? "text-ink/40" : "text-green-700/70"}`}>
            {ageMinutes}m ago
          </div>
        )}
      </div>
    </div>
  );
}
