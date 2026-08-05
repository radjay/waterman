"use client";

import { primaryMetric } from "../../lib/conditions";
import { scoreColour } from "../../lib/scoreShade";
import { dtf } from "../../lib/datetime";

const TZ = "Europe/Lisbon";
const time = (ms) =>
  dtf("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(ms));

/**
 * The window, hour by hour.
 *
 * "Do I believe it" is partly a question about shape: a window that holds for
 * three hours is a different proposition from one that spikes for one and
 * collapses. The week strip answers it as a gradient across six days; here
 * there is room to answer it as actual numbers.
 *
 * This is the part of the screen that works with no per-model data at all,
 * which is most of the time until the model ingest is deployed.
 */
export function HourByHour({ slots, sport, tides = [] }) {
  if (!slots?.length) return null;

  return (
    <section className="pt-[22px]">
      <h2 className="font-data text-[9px] tracking-label-wide text-dim mb-2.5">HOUR BY HOUR</h2>

      <div className="rounded-[15px] bg-surface border border-card overflow-hidden">
        {slots.map((slot, i) => {
          const metric = primaryMetric(slot, sport);
          const hasScore = slot.score !== null && slot.score !== undefined;

          // Tide turns inside this slot's three hours are worth calling out —
          // for surf they change the answer, and for wing they explain a spot
          // going soft without the wind doing anything.
          const turns = tides.filter(
            (t) => t.time >= slot.timestamp && t.time < slot.timestamp + 3 * 60 * 60 * 1000
          );

          return (
            <div
              key={slot.timestamp}
              className={`flex items-center gap-3 px-[14px] py-[11px] ${
                i > 0 ? "border-t border-card" : ""
              }`}
            >
              <span className="w-[44px] font-data text-[11px] text-faded-ink tabular-nums">
                {time(slot.timestamp)}
              </span>

              <span className="flex-1 min-w-0">
                <span className="block font-data text-[12px] text-ink truncate">
                  {metric
                    ? `${metric.value} ${metric.unit}${
                        metric.directionLabel ? ` ${metric.directionLabel}` : ""
                      }${metric.secondary ? ` ${metric.secondary}` : ""}`
                    : "—"}
                </span>
                {turns.length > 0 && (
                  <span className="block font-data text-[9px] text-dim mt-0.5">
                    {turns.map((t) => `${t.type.toUpperCase()} TIDE ${time(t.time)}`).join(" · ")}
                  </span>
                )}
              </span>

              {hasScore ? (
                <span className="flex items-center gap-2 flex-none">
                  <span
                    className="w-[34px] h-[6px] rounded-pill"
                    style={{ background: scoreColour(slot.score) }}
                    aria-hidden="true"
                  />
                  <span className="w-[22px] text-right font-data text-[11px] text-ink tabular-nums">
                    {Math.round(slot.score)}
                  </span>
                </span>
              ) : (
                <span className="w-[62px] text-right font-data text-[10px] text-dim">
                  not scored
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
