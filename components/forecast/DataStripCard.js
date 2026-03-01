"use client";

import { Metric } from "../shared/Metric";
import { ScoreBadge } from "../shared/ScoreBadge";
import { formatTime } from "../../lib/utils";

/**
 * DataStripCard Component
 *
 * Compressed horizontal "strip" layout for forecast data
 * Max height of 80px on mobile, eliminates vertical scrolling fatigue
 */

export function DataStripCard({ slot, spot, onClick }) {
  const time = formatTime(new Date(slot.timestamp));
  const score = slot.score?.value || 0;

  // Extract key metrics
  const windSpeed = slot.wind?.speed || "--";
  const windDir = slot.wind?.deg;
  const swellHeight = slot.waves?.height || slot.swell?.height || "--";
  const swellDir = slot.swell?.direction;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-3 px-3 border-b border-ink/10 hover:bg-ink/5 transition-colors group"
    >
      {/* Time */}
      <div className="w-16 flex-shrink-0">
        <span className="font-mono text-sm font-medium text-ink">{time}</span>
      </div>

      {/* Data Metrics */}
      <div className="flex-1 flex items-center gap-4 px-4">
        <Metric label="Wind" value={windSpeed} unit="kn" trend={windDir} compact />
        <Metric label="Swell" value={swellHeight} unit="m" trend={swellDir} compact />
      </div>

      {/* Score Badge */}
      <div className="flex-shrink-0">
        <ScoreBadge score={score} size="default" />
      </div>
    </button>
  );
}

/**
 * DataStripHeader Component
 *
 * Header for a group of data strips (e.g., spot name, date)
 */
export function DataStripHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between py-3 px-3 bg-newsprint sticky top-0 z-10 border-b-2 border-ink/20">
      <div>
        <h3 className="font-headline text-lg font-bold text-ink">{title}</h3>
        {subtitle && <p className="text-xs text-ink/60 font-mono mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
