"use client";

import { useState, useEffect } from "react";
import { Wind } from "lucide-react";
import { Arrow } from "../ui/Arrow";
import { Badge } from "../ui/Badge";

/**
 * LiveWindIndicator component displays real-time wind data from Windguru stations.
 * Shows wind speed in knots and direction with an arrow indicator.
 *
 * @param {string} stationId - Windguru station ID (extracted from liveReportUrl)
 * @param {string} className - Additional CSS classes
 * @param {boolean} compact - If true, show compact version (for overlays)
 */
export function LiveWindIndicator({ stationId, className = "", compact = false, label = null }) {
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
  const isStale = ageMinutes > 60; // Consider stale if older than 60 minutes (stations report every 10-30 min)

  // Don't show stale data — hiding is less confusing than showing old readings
  if (isStale) return null;

  const speed = Math.round(liveWind.windSpeedKnots);
  const gust = Number.isFinite(liveWind.windGustKnots)
    ? Math.round(liveWind.windGustKnots)
    : null;
  const arrow = Number.isFinite(liveWind.windDirection) ? (
    <Arrow direction={(liveWind.windDirection + 180) % 360} size={compact ? 8 : 10} />
  ) : null;

  // Uses the shared Badge rather than a lookalike, so these read as the same
  // object as every other pill in the app — same radius, padding, mono face and
  // tracking — and pick up palette changes for free.
  return (
    <Badge
      variant={compact ? "overlay" : isStale ? "default" : "accent"}
      className={`${isStale ? "opacity-70" : ""} ${className}`}
      title={
        compact
          ? `Live wind: ${speed} kn${gust ? ` (${gust} gusts)` : ""} • Updated ${ageMinutes}m ago`
          : `Live wind from Windguru station ${stationId} • Updated ${ageMinutes}m ago`
      }
    >
      {/* Beside a forecast figure, an unlabelled second number is just
          confusing — the label is what makes it read as "and right now it is". */}
      {label && !compact && <span className="opacity-70">{label}</span>}
      <Wind size={compact ? 10 : 11} className={compact ? "" : "text-accent"} />
      <span className="font-bold tabular-nums">{speed}</span>
      {gust !== null && <span className="opacity-70 tabular-nums">({gust})</span>}
      {arrow}
    </Badge>
  );
}

export function extractWindguruStationId(url) {
  if (!url) return null;
  const match = url.match(/station\/(\d+)/);
  return match ? match[1] : null;
}
