"use client";

import { useMemo, useState } from "react";
import { BANDS } from "../../lib/agreement";
import { windowTrackPosition } from "../../lib/windows";
import { primaryMetric } from "../../lib/conditions";
import { LEGEND_TIERS, windowGradient } from "../../lib/scoreShade";

const HOUR_MS = 60 * 60 * 1000;
const SLOT_HOURS = 3;
const TZ = "Europe/Lisbon";

/** Fallback axis when a day has no slots inside the visible hours. */
const FALLBACK_AXIS = { startHour: 6, endHour: 24, marks: [6, 9, 12, 15, 18, 21] };

/**
 * The strip is a daylight view. Forecast slots run right through the night, and
 * stretching the axis to fit them spends a third of the track on 01:00 and
 * 04:00 — hours nobody is deciding about.
 *
 * A slot is included only when its WHOLE three-hour block fits the window. The
 * 22:00 slot runs to 01:00, so admitting it on the grounds that 22:00 is inside
 * the window dragged the track three hours into the night and left dead space
 * on the right. On a 3-hourly grid this makes 19:00 the last mark.
 */
const FIRST_VISIBLE_HOUR = 6;
const LAST_VISIBLE_HOUR = 22;

/**
 * The axis is derived from the forecast's own slot times, not hardcoded.
 *
 * Slots arrive on a 3-hourly UTC grid, which lands on 07:00 / 10:00 / 13:00 in
 * Lisbon summer time and 06:00 / 09:00 / 12:00 in winter. A fixed 06/09/12 axis
 * therefore labelled the ticks an hour off for half the year, and the bands —
 * which are positioned from real timestamps — did not line up with them.
 *
 * Deriving it also means the axis follows a DST change on its own rather than
 * silently going wrong twice a year.
 */
function deriveAxis(days) {
  const hours = new Set();
  for (const day of days) {
    for (const slot of day.slots ?? []) {
      const h = Math.round((slot.timestamp - day.dayStart) / HOUR_MS);
      if (h >= FIRST_VISIBLE_HOUR && h + SLOT_HOURS <= LAST_VISIBLE_HOUR) hours.add(h);
    }
  }
  if (hours.size === 0) return FALLBACK_AXIS;

  const marks = [...hours].sort((a, b) => a - b);
  return {
    startHour: marks[0],
    // A slot represents the three hours it opens, so the track has to run to
    // the END of the last one or the final band is clipped.
    endHour: marks[marks.length - 1] + SLOT_HOURS,
    marks,
  };
}

/** Label an hour offset from local midnight, wrapping past 24h. */
const hourLabel = (h) => `${String(Math.floor(h) % 24).padStart(2, "0")}:00`;

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
 * The handoff marks each window's peak with a 2px page-colour notch. That was
 * designed against FLAT bands; inside a gradient it is indistinguishable from a
 * seam between two bands, and read as a rendering artifact rather than as
 * information. The gradient already puts the peak at its brightest point, so
 * the notch is dropped rather than restyled — the information is not lost.
 *
 * The legend is not decoration. Tier and marginal are carried by fill alone,
 * and in Dayglass the accent and the accent-2 hue sit at nearly identical
 * luminance — they differ by hue. The legend is the non-colour carrier.
 *
 * Numbers live in a hover/tap readout so the glanceable view stays glanceable
 * and the detail is one gesture away.
 */
export function WeekStrip({ days, sport, title = "The week", onSelectWindow }) {
  const [hovered, setHovered] = useState(null);
  const axis = useMemo(() => deriveAxis(days), [days]);
  // Re-rendered on mount only; the line does not need to tick, and a timer here
  // would re-render the whole strip every minute for a marker that moves less
  // than a pixel.
  const [now] = useState(() => Date.now());

  return (
    <section className="pt-[22px]">
      <h2 className="font-headline font-extrabold text-[25px] tracking-display-tight text-ink mb-1">
        {title}
      </h2>

      {/* Positioned absolutely rather than flexed evenly: a label has to sit
          over the slot it names, and the slots are not evenly divisible into
          the track once the axis is derived from real times. */}
      <div className="relative h-[22px] font-data text-[10px] text-dim" aria-hidden="true">
        <div className="absolute inset-y-0 left-[39px] right-[31px]">
          {axis.marks.map((h) => (
            <span
              key={h}
              className="absolute top-1.5"
              style={{
                left: `${((h - axis.startHour) / (axis.endHour - axis.startHour)) * 100}%`,
              }}
            >
              {hourLabel(h)}
            </span>
          ))}
          {/* Closes the range, so the last block reads as ending somewhere
              rather than the axis just stopping. */}
          <span className="absolute top-1.5 right-0 -mr-[14px]">
            {hourLabel(axis.endHour)}
          </span>
        </div>
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
            now={now}
            axis={axis}
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

function DayRow({ day, sport, hovered, onHover, onSelectWindow, now, axis }) {
  // Only today gets the marker, and only while "now" is inside the visible
  // hours — a line pinned to an edge would imply a time that is not on screen.
  const trackStart = day.dayStart + axis.startHour * HOUR_MS;
  const trackEnd = day.dayStart + axis.endHour * HOUR_MS;
  const nowPct =
    now >= trackStart && now <= trackEnd
      ? ((now - trackStart) / (trackEnd - trackStart)) * 100
      : null;
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
              dayStartHour: axis.startHour,
              dayEndHour: axis.endHour,
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
              </span>
            );
          })}

          {/* Hover/tap targets sit above the bands: one per forecast slot, so
              the readout is an actual reading rather than an interpolation. */}
          {(day.slots || []).map((slot) => {
            const left = ((slot.timestamp - trackStart) / (trackEnd - trackStart)) * 100;
            if (left < 0 || left >= 100) return null;
            const width = (SLOT_HOURS / (axis.endHour - axis.startHour)) * 100;
            const active = readout?.timestamp === slot.timestamp;

            return (
              <button
                key={slot.timestamp}
                className={`absolute top-0 bottom-0 focus-ring ${active ? "bg-ink/10" : "hover:bg-ink/10"}`}
                style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }}
                onMouseEnter={() => onHover({ dayStart: day.dayStart, slot, left, width })}
                onFocus={() => onHover({ dayStart: day.dayStart, slot, left, width })}
                onClick={() => {
                  const w = day.windows.find(
                    (win) => slot.timestamp >= win.start && slot.timestamp < win.end
                  );
                  if (w) onSelectWindow?.(day, w);
                  else onHover({ dayStart: day.dayStart, slot, left, width });
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

        {nowPct !== null && (
          // Overlay spanning exactly the track: 34px day label + 5px gap on the
          // left, 26px score + 5px gap on the right. Positioning inside the
          // track itself is not an option — it clips (overflow-hidden), which
          // would cut the NOW label off.
          <span
            className="absolute inset-y-0 left-[39px] right-[31px] pointer-events-none z-10"
            aria-hidden="true"
          >
            <span
              className="absolute inset-y-0 w-[2px] bg-now -translate-x-1/2"
              style={{ left: `${nowPct}%` }}
            />
            {/* Pill sits directly on top of the rule with no gap, so the two
                read as one marker rather than a label floating near a line. */}
            <span
              className="absolute -top-[11px] -translate-x-1/2 rounded-pill bg-now px-[5px] py-[1px] font-data text-[7.5px] font-bold tracking-[0.14em] text-white leading-[1.4]"
              style={{ left: `${nowPct}%` }}
            >
              NOW
            </span>
          </span>
        )}

        <div className={`w-[26px] text-right font-data text-[11px] ${scoreClass}`}>{scoreText}</div>
      </div>

      {metric && (
        <div
          role="status"
          // Centred over the hovered slot rather than pinned to the left of the
          // chart, so the readout points at the thing it describes. The track
          // starts 39px in (34px day label + 5px gap) and ends 31px from the
          // right (26px score + 5px gap); the inner span is positioned within
          // that, then nudged back by half its own width.
          className="absolute z-20 left-[39px] right-[31px] -top-1 -translate-y-full pointer-events-none"
        >
          <div
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${hovered.left + hovered.width / 2}%` }}
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
        </div>
      )}
    </div>
  );
}
