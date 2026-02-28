"use client";

import { useState, useEffect } from "react";
import { Wind } from "lucide-react";
import { Arrow } from "../ui/Arrow";

/**
 * LiveWindIndicator component displays real-time wind data from Windguru stations.
 * Shows wind speed in knots and direction with an arrow indicator.
 *
 * @param {string} stationId - Windguru station ID (extracted from liveReportUrl)
 * @param {string} className - Additional CSS classes
 * @param {boolean} compact - If true, show compact version (for overlays)
 */
export function LiveWindIndicator({ stationId, className = "", compact = false }) {
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

  if (compact) {
    // Compact version for overlays on webcams - ultra minimal
    return (
      <div
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded backdrop-blur-sm bg-black/70 text-white text-xs ${
          isStale ? "opacity-50" : ""
        } ${className}`}
        title={`Live wind: ${Math.round(liveWind.windSpeedKnots)} kn${liveWind.windGustKnots ? ` (${Math.round(liveWind.windGustKnots)} gusts)` : ""} • Updated ${ageMinutes}m ago`}
      >
        <Wind size={10} className="text-green-400" />
        <span className="font-bold tabular-nums">
          {Math.round(liveWind.windSpeedKnots)}
        </span>
        {liveWind.windGustKnots !== null && (
          <span className="opacity-70 tabular-nums">
            ({Math.round(liveWind.windGustKnots)})
          </span>
        )}
        {liveWind.windDirection !== null && (
          <Arrow direction={(liveWind.windDirection + 180) % 360} size={8} />
        )}
      </div>
    );
  }

  // Full version for spot headers - now more compact to avoid wrapping
  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${
        isStale
          ? "border-ink/20 bg-ink/5"
          : "border-green-500/30 bg-green-50"
      } ${className}`}
      title={`Live wind from Windguru station ${stationId} • Updated ${ageMinutes}m ago`}
    >
      <Wind
        size={12}
        className={isStale ? "text-ink/40" : "text-green-600"}
      />
      <span
        className={`font-bold tabular-nums ${
          isStale ? "text-ink/60" : "text-green-900"
        }`}
      >
        {Math.round(liveWind.windSpeedKnots)}
      </span>
      {liveWind.windGustKnots !== null && (
        <span
          className={`opacity-70 tabular-nums ${
            isStale ? "text-ink/50" : "text-green-800"
          }`}
        >
          ({Math.round(liveWind.windGustKnots)})
        </span>
      )}
      {liveWind.windDirection !== null && (
        <Arrow
          direction={(liveWind.windDirection + 180) % 360}
          size={10}
          className={isStale ? "text-ink/40" : "text-green-700"}
        />
      )}
    </div>
  );
}

/**
 * Extract Windguru station ID from liveReportUrl
 * @param {string} url - URL like "https://www.windguru.cz/station/2329"
 * @returns {string|null} Station ID or null
 */
export function extractWindguruStationId(url) {
  if (!url) return null;
  const match = url.match(/station\/(\d+)/);
  return match ? match[1] : null;
}
