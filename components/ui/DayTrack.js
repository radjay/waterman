"use client";

import { nowPercent, sameDay } from "../../lib/dayChart";

/**
 * A day on the 07-22 clock: where the window sits, and where now is.
 *
 * Two sizes of the same idea. The week strip uses the 26-30px version, where
 * the band has to be readable on its own; the spot-forecast rows use a 5px
 * rule, where it is a sparkline beside a sentence that already says the hours.
 *
 * The band is a gradient rather than a flat block because a window is not
 * uniform — it builds, peaks and dies — and a flat fill made a marginal
 * three-hour slot look identical to a six-hour session at 90. Sub-60 days get
 * the marginal wash instead: still drawn, because "nothing here clears the bar"
 * is an answer, but never wearing the accent, which is reserved for what is
 * worth acting on.
 *
 * An empty day draws bare track. That is the point — the row still exists.
 */
export function DayTrack({
  windows = [],
  dayStart,
  firstHour,
  lastHour,
  nowMs = Date.now(),
  height = 26,
  radius = 7,
  showNow = true,
  className = "",
}) {
  const hourMs = 60 * 60 * 1000;
  const trackStart = dayStart + firstHour * hourMs;
  const trackEnd = dayStart + lastHour * hourMs;
  const span = trackEnd - trackStart;

  const nowPct =
    showNow && sameDay(nowMs, dayStart) ? nowPercent(nowMs, firstHour, lastHour) : null;

  return (
    <div
      className={`relative bg-track overflow-hidden ${className}`}
      style={{ height, borderRadius: radius }}
    >
      {span > 0 &&
        windows.map((window, i) => {
          const start = Math.max(window.start, trackStart);
          const end = Math.min(window.end, trackEnd);
          if (end <= start) return null;
          const left = ((start - trackStart) / span) * 100;
          const width = ((end - start) / span) * 100;
          const marginal = window.score !== null && window.score < 60;

          return (
            <span
              key={i}
              className="absolute inset-y-0"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                background: marginal
                  ? "linear-gradient(90deg, var(--wm-marginal-low), rgb(var(--wm-marginal) / 0.42) 60%, var(--wm-marginal-low))"
                  : "linear-gradient(90deg, var(--wm-accent-mid), rgb(var(--wm-accent)) 55%, var(--wm-accent-mid))",
              }}
            />
          );
        })}

      {nowPct !== null && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-[2px] bg-now"
          style={{ left: `${nowPct}%` }}
        />
      )}
    </div>
  );
}
