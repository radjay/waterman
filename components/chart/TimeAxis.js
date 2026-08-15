import { hourLabel } from "../../lib/dayChart";

/**
 * The one time axis every band on a panel shares.
 *
 * Marks come from the day's own slot times rather than being hardcoded 07/10/13
 * — the forecast grid is UTC, so it lands an hour earlier in winter, and a
 * fixed axis labelled every column wrong for half the year.
 */
export function TimeAxis({ chart, size = 9, withMinutes = false, className = "", style }) {
  return (
    <div
      className={`flex items-center justify-between font-data text-dim tabular-nums ${className}`}
      style={{ fontSize: size, ...style }}
      aria-hidden="true"
    >
      {chart.marks.map((h) => (
        <span key={h}>{hourLabel(h, withMinutes)}</span>
      ))}
    </div>
  );
}

/**
 * The now rule.
 *
 * 2px, in the now hue, on the continuous time scale — never on a slot boundary,
 * where it would read as a divider between two forecasts rather than as a time.
 * Rendered as a sibling of the bands rather than inside one so a single rule
 * crosses all three and the eye can follow it down.
 */
export function NowLine({ chart, top = 0, bottom = 0, className = "", z = 3 }) {
  if (chart.nowPct === null) return null;
  return (
    <div
      aria-hidden="true"
      className={`absolute w-[2px] bg-now ${className}`}
      style={{ left: `${chart.nowPct}%`, top, bottom, zIndex: z }}
    />
  );
}
