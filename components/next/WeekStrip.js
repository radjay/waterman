"use client";

import { BANDS } from "../../lib/agreement";
import { windowTrackPosition } from "../../lib/windows";

const HOUR_LABELS = [6, 9, 12, 15, 18, 21];
const DAY_START_HOUR = 6;
const DAY_END_HOUR = 24;

/**
 * The week, readable at a glance without parsing a single number.
 *
 * Three band states, and the third is the point: "models split" gets its own
 * dashed rendering rather than being averaged away. Absence of confidence is
 * information, so it is drawn rather than hidden.
 *
 * A legend is not decoration here. The good/marginal distinction is carried by
 * fill colour, and in Dayglass those two sit at nearly identical luminance —
 * they differ by hue alone. The legend is the non-colour carrier.
 */
export function WeekStrip({ days, sportLabel = "", onSelectWindow }) {
  return (
    <section className="pt-[22px]">
      <h2 className="font-data text-[9px] tracking-label-wide text-dim mb-1">
        THE WEEK{sportLabel ? ` · ${sportLabel}` : ""}
      </h2>

      <div className="flex gap-[5px] font-data text-[8px] text-dim pt-2 pb-1.5" aria-hidden="true">
        <div className="w-[34px]" />
        {HOUR_LABELS.map((h) => (
          <div key={h} className="flex-1 text-left">
            {String(h).padStart(2, "0")}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        {days.map((day) => (
          <DayRow key={day.dayStart} day={day} onSelectWindow={onSelectWindow} />
        ))}
      </div>

      <div className="flex flex-wrap gap-[11px] mt-3.5 font-data text-[9px] text-dim">
        <LegendKey className="bg-accent" label="GOOD" />
        <LegendKey className="bg-marginal" label="MARGINAL" />
        <LegendKey className="bg-accent-faint border border-dashed border-accent-border" label="MODELS SPLIT" />
      </div>
    </section>
  );
}

function LegendKey({ className, label }) {
  return (
    <span className="flex items-center gap-[5px]">
      <span className={`w-3 h-1.5 rounded-[2px] ${className}`} />
      {label}
    </span>
  );
}

const BAND_CLASS = {
  [BANDS.GOOD]: "bg-accent",
  [BANDS.SPLIT]: "bg-accent-faint border border-dashed border-accent-border",
  [BANDS.NO]: "bg-marginal",
  [BANDS.UNKNOWN]: "bg-track",
};

function DayRow({ day, onSelectWindow }) {
  const hasAnything = day.windows.length > 0;
  // "?" when the day's only windows are split — the score is not a claim we can
  // make, and a number would imply more confidence than we have.
  const allSplit = hasAnything && day.windows.every((w) => w.band === BANDS.SPLIT);

  const scoreText = !hasAnything ? "—" : allSplit ? "?" : day.bestScore ?? "—";
  const scoreClass = !hasAnything
    ? "text-dim"
    : allSplit
      ? "text-dim"
      : day.bestScore >= 60
        ? "text-accent"
        : "text-marginal";

  return (
    <div className="flex items-center gap-[5px]">
      <div
        className={`w-[34px] font-data text-[10px] ${hasAnything ? "text-ink" : "text-dim"}`}
      >
        {day.label}
      </div>

      <div className="flex-1 h-[26px] rounded-[6px] bg-track relative overflow-hidden">
        {day.windows.map((window, i) => {
          const pos = windowTrackPosition(window, day.dayStart, {
            dayStartHour: DAY_START_HOUR,
            dayEndHour: DAY_END_HOUR,
          });
          if (!pos) return null;

          const marginal = window.score !== null && window.score < 60;
          const band = window.band === BANDS.SPLIT ? BANDS.SPLIT : marginal ? BANDS.NO : BANDS.GOOD;

          return (
            <button
              key={i}
              onClick={() => onSelectWindow?.(day, window)}
              aria-label={`${day.label} window`}
              className={`absolute top-0 bottom-0 ${BAND_CLASS[band]}`}
              style={{ left: `${pos.left}%`, width: `${pos.width}%` }}
            >
              {pos.peak !== null && (
                <span
                  className="absolute top-0 bottom-0 w-0.5 bg-page"
                  style={{ left: `${((pos.peak - pos.left) / pos.width) * 100}%` }}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className={`w-[26px] text-right font-data text-[11px] ${scoreClass}`}>
        {scoreText}
      </div>
    </div>
  );
}
