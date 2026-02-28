"use client";

import { useState, useEffect } from "react";
import { Wind } from "lucide-react";
import { Arrow } from "../ui/Arrow";

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
    <div
      className={`flex items-center justify-between py-3 px-2 border-t border-ink/10 bg-green-50/30 ${className}`}
    >
      {/* Time/Label */}
      <div className="flex items-center gap-2 min-w-[80px]">
        <span className="text-xs font-bold text-green-700 uppercase">Live</span>
      </div>

      {/* Wind data */}
      <div className="flex items-center gap-4 flex-1 justify-start pl-4">
        <div className="flex items-center gap-1.5">
          <Wind size={14} className={isStale ? "text-ink/40" : "text-green-600"} />
          <span className={`text-sm font-bold tabular-nums ${isStale ? "text-ink/60" : "text-ink"}`}>
            {Math.round(liveWind.windSpeedKnots)} kn
          </span>
          {liveWind.windGustKnots !== null && (
            <span className={`text-sm tabular-nums ${isStale ? "text-ink/40" : "text-ink/60"}`}>
              ({Math.round(liveWind.windGustKnots)}*)
            </span>
          )}
          {liveWind.windDirection !== null && (
            <>
              <span className="text-ink/40 mx-1">|</span>
              <Arrow
                direction={liveWind.windDirection}
                size={12}
                className={isStale ? "text-ink/40" : "text-ink/70"}
              />
            </>
          )}
        </div>
      </div>

      {/* Age indicator */}
      {ageMinutes > 0 && (
        <div className="text-xs text-ink/40 min-w-[60px] text-right">
          {ageMinutes}m ago
        </div>
      )}
    </div>
  );
}
