"use client";

import { DirectionalArrow, CompassLabel } from "./DirectionalArrow";

/**
 * Metric Component
 *
 * Reusable label + value pair for displaying weather data
 * Supports optional trend (directional arrow) and unit
 */

export function Metric({ label, value, unit, trend, compact = false }) {
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {trend !== undefined && trend !== null && (
          <DirectionalArrow degrees={trend} size={12} className="text-ink/60" />
        )}
        <span className="font-mono text-sm text-ink">
          {value}
          {unit && <span className="text-ink/60">{unit}</span>}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase text-ink/60 font-bold">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-base text-ink font-medium">
          {value}
          {unit && <span className="text-sm text-ink/60 ml-0.5">{unit}</span>}
        </span>
        {trend !== undefined && trend !== null && (
          <div className="flex items-center gap-1">
            <DirectionalArrow degrees={trend} size={14} className="text-ink/60" />
            <CompassLabel degrees={trend} />
          </div>
        )}
      </div>
    </div>
  );
}
