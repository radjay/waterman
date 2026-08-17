"use client";

import {
  PLOT_LABEL_INSET_PX,
  SCORE_FILL,
  scoreBand,
  scoreTextClass,
} from "../../lib/dayChart";
import { Tooltip } from "../ui/Tooltip";

/**
 * AI timeslot verdict for the SCORE tip — the scorer's own sentence when we
 * have it, otherwise a short fallback so empty days still explain the click.
 */
export function slotVerdictText(slot) {
  const reasoning = typeof slot?.reasoning === "string" ? slot.reasoning.trim() : "";
  if (reasoning) return reasoning;
  const score = slot?.score;
  if (score === null || score === undefined) return "No verdict for this timeslot.";
  return `Score ${Math.round(score)}. No AI verdict for this timeslot.`;
}

/**
 * The score, per slot, across the day.
 *
 * The number is printed above every bar rather than on hover. This is the band
 * that answers "and when is it best" — a shape alone tells you there is a peak
 * but not whether the peak is a 90 or a 61, and those are different afternoons.
 *
 * When `reportHref` is set (Now), each whole column is a real link to that
 * spot's report. On the Report itself, pass `slotVerdict` instead — click/hover
 * shows the AI timeslot verdict tip and does not navigate.
 *
 * Number and bar fill share `scoreBand` / `scoreTextClass` so a MAYBE 60 cannot
 * sit orange on a teal bar, and a 0 cannot sit orange either. The now-line marks
 * "you are here"; the score colour stays quality, not position.
 *
 * Bars occupy roughly half the band height so the numbers have room. That ratio
 * is a layout constant rather than a scale — the printed number is the value,
 * and the bar is there to make the shape of the day scannable.
 */
export function ScoreBand({
  chart,
  height,
  barRatio = 0.52,
  numberSize = 12,
  gutter = 1.5,
  radius = 3,
  reportHref = null,
  /** Hover/click tip with the AI timeslot verdict — used on Report expanded days. */
  slotVerdict = false,
  labelInset = PLOT_LABEL_INSET_PX,
  className = "",
}) {
  const scored = chart.columns.filter(
    (c) => c.slot?.score !== null && c.slot?.score !== undefined
  );
  if (scored.length === 0) return null;

  return (
    <div className={`relative overflow-visible ${className}`} style={{ height }}>
      <div className="absolute inset-0 overflow-visible" style={{ left: labelInset }}>
        {chart.columns.map((col) => {
          const score = col.slot?.score;
          if (score === null || score === undefined) return null;
          const fill = SCORE_FILL[scoreBand(score)];
          const numberClass = scoreTextClass(score);
          const rounded = Math.round(score);
          const interactive = Boolean(reportHref || slotVerdict);
          const shellClass = `absolute inset-y-0 flex flex-col justify-end ${
            interactive
              ? "focus-ring rounded-sm hover:opacity-90 transition-opacity duration-fast ease-smooth"
              : ""
          }`;
          const shellStyle = {
            left: `${col.left}%`,
            width: `${col.width}%`,
            padding: `0 ${gutter}px`,
          };
          const numberEl = (
            <div
              className={`font-data font-bold text-center tabular-nums leading-none mb-[3px] ${numberClass} ${
                interactive ? "underline-offset-2 group-hover:underline" : ""
              }`}
              style={{ fontSize: numberSize }}
            >
              {rounded}
            </div>
          );
          const barEl = (
            <div
              className="w-full"
              style={{
                height: `${Math.max(0, Math.min(100, score)) * barRatio}%`,
                borderRadius: `${radius}px ${radius}px 0 0`,
                background: fill.color,
                opacity: fill.opacity,
              }}
            />
          );

          if (reportHref) {
            return (
              <a
                key={col.slot.timestamp}
                href={reportHref}
                aria-label={`Score ${rounded}, open spot report`}
                className={`${shellClass} group`}
                style={shellStyle}
              >
                {numberEl}
                {barEl}
              </a>
            );
          }

          if (slotVerdict) {
            const verdict = slotVerdictText(col.slot);
            return (
              <Tooltip
                key={col.slot.timestamp}
                content={verdict}
                wide
                position="top"
                className={`${shellClass} group cursor-help`}
                style={shellStyle}
              >
                <button
                  type="button"
                  aria-label={`Score ${rounded}: ${verdict}`}
                  className="w-full h-full flex flex-col justify-end bg-transparent border-0 p-0 m-0 cursor-help"
                >
                  {numberEl}
                  {barEl}
                </button>
              </Tooltip>
            );
          }

          return (
            <div key={col.slot.timestamp} className={shellClass} style={shellStyle}>
              {numberEl}
              {barEl}
            </div>
          );
        })}
      </div>
    </div>
  );
}
