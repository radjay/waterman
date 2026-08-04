"use client";

import { useState } from "react";
import { BANDS } from "../../lib/agreement";
import { windowTrackPosition } from "../../lib/windows";
import { primaryMetric } from "../../lib/conditions";
import { LEGEND_TIERS, windowGradient } from "../../lib/scoreShade";

const HOUR_LABELS = [6, 9, 12, 15, 18, 21];
const DAY_START_HOUR = 6;
const DAY_END_HOUR = 24;
const HOUR_MS = 60 * 60 * 1000;
const TZ = "Europe/Lisbon";

/**
 * The week, readable at a glance without parsing a single number.
 *
 * Bands are shaded by score (fair / good / great / epic) so a row reads as a
 * ranking rather than as flat blocks — the strip answers "which one" as well as
 * "when". Gradients are built from the accent channel triple, so both themes
 * shade correctly without a second palette.
 *
 * "Models split" keeps its own dashed rendering rather than being averaged
 * away: absence of confidence is information, so it is drawn, not hidden.
 *
 * The legend is not decoration. Tier and marginal are carried by fill alone,
 * and in Dayglass the accent and the accent-2 hue sit at nearly identical
 * luminance — they differ by hue. The legend is the non-colour carrier.
 *
 * Numbers live in a hover/tap readout so the glanceable view stays glanceable
 * and the detail is one gesture away.
 */
export function WeekStrip({ days, sport, sportLabel = "", onSelectWindow }) {
  const [hovered, setHovered] = useState(null);

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
          <DayRow
            key={day.dayStart}
            day={day}
            sport={sport}
            hovered={hovered}
            onHover={setHovered}
            onSelectWindow={onSelectWindow}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-[11px] mt-3.5 font-data text-[9px] text-dim">
        {LEGEND_TIERS.map((tier) => (
          <LegendKey key={tier.id} style={{ background: windowGradient(tier.min) }} label={tier.label} />
        ))}
        <LegendKey style={{ background: windowGradient(0, { marginal: true }) }} label="MARGINAL" />
        <LegendKey className="bg-accent-faint border border-dashed border-accent-border" label="MODELS SPLIT" />
      </div>
    </section>
  );
}

function LegendKey({ className = "", style, label }) {
  return (
    <span className="flex items-center gap-[5px]">
      <span className={`w-3 h-1.5 rounded-[2px] ${className}`} style={style} />
      {label}
    </span>
  );
}

function DayRow({ day, sport, hovered, onHover, onSelectWindow }) {
  const hasAnything = day.windows.length > 0;
  // "?" when the day's only windows are split — a number there would imply more
  // confidence than we have.
  const allSplit = hasAnything && day.windows.every((w) => w.band === BANDS.SPLIT);

  const scoreText = !hasAnything ? "—" : allSplit ? "?" : (day.bestScore ?? "—");
  const scoreClass = !hasAnything
    ? "text-dim"
    : allSplit
      ? "text-dim"
      : day.bestScore >= 60
        ? "text-accent"
        : "text-marginal";

  const isHovered = hovered?.dayStart === day.dayStart;
  const readout = isHovered ? hovered.slot : null;
  const metric = readout ? primaryMetric(readout, sport) : null;

  return (
    <div className="relative">
      <div className="flex items-center gap-[5px]">
        <div className={`w-[34px] font-data text-[10px] ${hasAnything ? "text-ink" : "text-dim"}`}>
          {day.label}
        </div>

        <div
          className="flex-1 h-[26px] rounded-[6px] bg-track relative overflow-hidden"
          onMouseLeave={() => onHover(null)}
        >
          {day.windows.map((window, i) => {
            const pos = windowTrackPosition(window, day.dayStart, {
              dayStartHour: DAY_START_HOUR,
              dayEndHour: DAY_END_HOUR,
            });
            if (!pos) return null;

            const isSplit = window.band === BANDS.SPLIT;
            const isMarginal = window.score !== null && window.score < 60;

            return (
              <span
                key={i}
                className={`absolute top-0 bottom-0 pointer-events-none ${
                  isSplit ? "bg-accent-faint border border-dashed border-accent-border" : ""
                }`}
                style={{
                  left: `${pos.left}%`,
                  width: `${pos.width}%`,
                  // Ramped across the window's own slots, so the band climbs
                  // and falls with the afternoon instead of sitting flat.
                  background: isSplit ? undefined : windowGradient(window, { marginal: isMarginal }),
                }}
              >
                {pos.peak !== null && (
                  <span
                    className="absolute top-0 bottom-0 w-0.5 bg-page"
                    style={{ left: `${((pos.peak - pos.left) / pos.width) * 100}%` }}
                    aria-hidden="true"
                  />
                )}
              </span>
            );
          })}

          {/* Hover/tap targets sit above the bands: one per forecast slot, so
              the readout is an actual reading rather than an interpolation. */}
          {(day.slots || []).map((slot) => {
            const left =
              ((slot.timestamp - (day.dayStart + DAY_START_HOUR * HOUR_MS)) /
                ((DAY_END_HOUR - DAY_START_HOUR) * HOUR_MS)) *
              100;
            if (left < 0 || left >= 100) return null;
            const width = (3 / (DAY_END_HOUR - DAY_START_HOUR)) * 100;
            const active = readout?.timestamp === slot.timestamp;

            return (
              <button
                key={slot.timestamp}
                className={`absolute top-0 bottom-0 focus-ring ${active ? "bg-ink/10" : "hover:bg-ink/10"}`}
                style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }}
                onMouseEnter={() => onHover({ dayStart: day.dayStart, slot })}
                onFocus={() => onHover({ dayStart: day.dayStart, slot })}
                onClick={() => {
                  const w = day.windows.find(
                    (win) => slot.timestamp >= win.start && slot.timestamp < win.end
                  );
                  if (w) onSelectWindow?.(day, w);
                  else onHover({ dayStart: day.dayStart, slot });
                }}
                aria-label={`${day.label} ${new Intl.DateTimeFormat("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: TZ,
                }).format(new Date(slot.timestamp))}`}
              />
            );
          })}
        </div>

        <div className={`w-[26px] text-right font-data text-[11px] ${scoreClass}`}>{scoreText}</div>
      </div>

      {metric && (
        <div
          role="status"
          className="absolute z-20 left-[39px] -top-1 -translate-y-full pointer-events-none"
        >
          <div className="inline-flex items-center gap-2 rounded-card-sm bg-nav-bg border border-nav-border shadow-nav backdrop-blur-md px-2.5 py-1.5 font-data text-[10px] whitespace-nowrap">
            <span className="text-dim">
              {new Intl.DateTimeFormat("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: TZ,
              }).format(new Date(readout.timestamp))}
            </span>
            <span className="text-ink">
              {metric.value} {metric.unit}
              {metric.directionLabel ? ` ${metric.directionLabel}` : ""}
            </span>
            {metric.secondary && <span className="text-faded-ink">{metric.secondary}</span>}
            {readout.spotName && <span className="text-dim">· {readout.spotName}</span>}
            {readout.score !== null && readout.score !== undefined && (
              <span className={readout.score >= 60 ? "text-accent" : "text-faded-ink"}>
                {Math.round(readout.score)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
