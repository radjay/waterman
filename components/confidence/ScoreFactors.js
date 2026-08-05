"use client";

import { Waves, Wind, Moon } from "lucide-react";
import { scoreColour } from "../../lib/scoreShade";

/**
 * What the scorer actually weighed.
 *
 * Every condition_scores row already stores a per-dimension breakdown —
 * windQuality, waveQuality, tideQuality — and nothing in the app has ever shown
 * it. On a screen whose entire job is "do I believe it", a stored explanation
 * of how the number was reached is the most direct answer available, and it is
 * there whether or not per-model data has been ingested.
 *
 * Bars are shaded on the same ramp as the week strip, so a reader who has
 * learned what "great" looks like there reads these without a second legend.
 */
const DIMENSIONS = [
  { key: "windQuality", label: "WIND", icon: Wind },
  { key: "waveQuality", label: "WAVE", icon: Waves },
  { key: "tideQuality", label: "TIDE", icon: Moon },
];

export function ScoreFactors({ factors, reasoning }) {
  const rows = DIMENSIONS.map((d) => ({ ...d, value: factors?.[d.key] })).filter(
    (d) => d.value !== null && d.value !== undefined
  );

  if (rows.length === 0 && !reasoning) return null;

  return (
    <section className="pt-[22px]">
      <h2 className="font-data text-[9px] tracking-label-wide text-dim mb-2.5">
        WHAT THE SCORER WEIGHED
      </h2>

      {rows.length > 0 && (
        <div className="flex flex-col gap-[7px]">
          {rows.map(({ key, label, icon: Icon, value }) => (
            <div key={key} className="flex items-center gap-2.5">
              <Icon size={13} className="text-faded-ink flex-none" />
              <span className="w-[38px] font-data text-[9px] tracking-label text-faded-ink">
                {label}
              </span>
              <span className="flex-1 h-[10px] rounded-pill bg-track overflow-hidden">
                <span
                  className="block h-full rounded-pill"
                  style={{
                    width: `${Math.max(2, Math.min(100, value))}%`,
                    background: scoreColour(value),
                  }}
                />
              </span>
              <span className="w-[26px] text-right font-data text-[11px] text-ink tabular-nums">
                {Math.round(value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {reasoning && (
        <p className="text-[13px] leading-[1.5] text-faded-ink mt-3.5">{reasoning}</p>
      )}
    </section>
  );
}
