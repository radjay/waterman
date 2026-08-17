"use client";

import { MicroLabel } from "../ui/MicroLabel";
import { DayTrack } from "../ui/DayTrack";
import { TimeAxis } from "../chart/TimeAxis";
import { dtf } from "../../lib/datetime";
import { TZ } from "../../lib/dayChart";

/**
 * The week on one clock.
 *
 * Every day is the same 07-22 track, so the eye compares position and length
 * without reading a single number: Saturday's band starting further right than
 * Friday's IS "it comes in later", and a band that spans the row IS "all day".
 * A column of times could not be read that way at a glance.
 *
 * Empty days keep their row and show an em dash. Dropping them would compress
 * the week into "the days that work", which is a different and much less useful
 * chart — the gaps are the reason a rider is on this screen.
 *
 * Tapping a day opens its best slots underneath rather than navigating. The
 * question "which three hours on Saturday" does not deserve a page.
 */
export function WeekStrip({
  days,
  selectedDay,
  onSelectDay,
  onSelectSlot,
  chart,
  nowMs = Date.now(),
  desktop = false,
  className = "",
}) {
  return (
    <section className={className}>
      <MicroLabel size={desktop ? "md" : "sm"} className="pb-[10px] md:pb-3">
        The week
      </MicroLabel>

      <div className="flex flex-col gap-2.5">
        {days.map((day) => {
          const open = day.dayStart === selectedDay;
          return (
            <div key={day.dayStart}>
              <button
                type="button"
                onClick={() => onSelectDay?.(open ? null : day.dayStart)}
                aria-expanded={open}
                className="w-full flex items-center gap-[10px] md:gap-4 focus-ring rounded-[8px] text-left"
              >
                <span
                  className={`flex-none font-data tracking-[0.14em] ${
                    desktop ? "w-[34px] text-[11px]" : "w-[28px] text-[10px]"
                  } ${day.isToday ? "text-accent" : "text-dim"}`}
                >
                  {day.label}
                </span>

                <DayTrack
                  windows={day.windows}
                  dayStart={day.dayStart}
                  firstHour={chart.firstHour}
                  lastHour={chart.lastHour}
                  nowMs={nowMs}
                  height={desktop ? 30 : 26}
                  radius={desktop ? 8 : 7}
                  className="flex-1"
                />

                <span
                  className={`flex-none text-right font-data font-bold tabular-nums ${
                    desktop ? "w-[34px] text-[15px]" : "w-[26px] text-[13px]"
                  } ${day.peak === null ? "text-dim" : day.peak >= 60 ? "text-accent" : "text-dim"}`}
                >
                  {day.peak === null ? "—" : Math.round(day.peak)}
                </span>
              </button>

              {open && day.best.length > 0 && (
                <div
                  className={`grid items-stretch pt-2.5 ${
                    desktop
                      ? "grid-cols-[34px_1fr_34px] gap-x-4"
                      : "grid-cols-[28px_1fr_26px] gap-x-2.5"
                  }`}
                >
                  <div className="col-start-2 col-end-4 flex gap-[7px] md:gap-2.5 min-w-0">
                    {day.best.map((slot) => (
                      <button
                        key={slot.timestamp}
                        type="button"
                        onClick={() => onSelectSlot?.(day, slot)}
                        className="flex-1 min-w-0 rounded-[10px] md:rounded-[12px] bg-surface border border-card px-[9px] py-2 md:px-3 md:py-2.5 text-left focus-ring hover:bg-ink-hover transition-colors duration-fast ease-smooth"
                      >
                        <span className="flex items-baseline justify-between gap-1">
                          <span className="font-data text-[10px] md:text-[11px] text-faded-ink tabular-nums">
                            {clock(slot.timestamp)}
                          </span>
                          <span
                            className={`font-data font-bold text-[13px] md:text-[16px] tabular-nums ${
                              slot.score >= 60 ? "text-accent" : "text-marginal"
                            }`}
                          >
                            {Math.round(slot.score)}
                          </span>
                        </span>
                        <span className="block font-data text-[9.5px] md:text-[10.5px] text-dim mt-[3px] md:mt-[5px] truncate">
                          {slot.spotName}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <TimeAxis
        chart={chart}
        size={desktop ? 10 : 9}
        withMinutes={desktop}
        className="mt-[9px] pt-2 border-t border-rule"
        style={
          desktop
            ? { paddingLeft: 50, paddingRight: 50 }
            : { paddingLeft: 38, paddingRight: 36 }
        }
      />
    </section>
  );
}

const clock = (ms) =>
  dtf("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(ms));
