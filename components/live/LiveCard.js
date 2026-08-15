"use client";

import { isWindSport } from "../sport/SportProvider";
import { ScoreDial, ScoreDialEmpty } from "../ui/ScoreDial";
import { WindLine } from "../ui/WindLine";
import { CamFrame } from "../ui/CamFrame";
import { WindOnlyChart } from "../chart/DayChartPanel";

/**
 * One spot, live: who it is, what the cam sees, what the wind is doing.
 *
 * The identity row sits ABOVE the cam on a phone. A card scrolled halfway up
 * the screen is just a picture of some water otherwise, and four beaches on the
 * same coast look alike enough that you cannot tell which one you are looking
 * at from the frame.
 *
 * At width the picture leads instead, because a 2×2 wall is scanned as
 * pictures, and the caption underneath is close enough to read as a label
 * rather than as a separate row.
 *
 * The wind chart is the point of the screen: the cam says what it looks like,
 * and the station line against the forecast columns says whether the model was
 * right. That contrast is the reason both are on the same card.
 */
export function LiveCard({
  pack,
  sport,
  chart,
  highlight = false,
  desktop = false,
  onOpenCam,
  onSelect,
  className = "",
}) {
  const { spot, score, station, slot } = pack;

  const identity = (
    <div className={`flex items-center ${desktop ? "gap-[14px]" : "gap-3"}`}>
      {score === null ? (
        <ScoreDialEmpty size={desktop ? 46 : 42} />
      ) : (
        <ScoreDial
          score={score}
          size={desktop ? 46 : 42}
          ring={11}
          value={desktop ? 16 : 14}
          showAll
        />
      )}
      <div className="flex-1 min-w-0">
        <div
          className={`font-headline font-bold tracking-display truncate ${
            score === null ? "text-faded-ink" : "text-ink"
          } ${desktop ? "text-[17px]" : "text-[16px]"}`}
        >
          {spot.name}
        </div>
        <LiveReading
          pack={pack}
          sport={sport}
          slot={slot}
          station={station}
          size={desktop ? 11.5 : 10.5}
        />
      </div>
    </div>
  );

  const wind = chart ? (
    <WindOnlyChart
      chart={chart}
      sport={sport}
      station={station}
      height={desktop ? 44 : 38}
      labelSize={desktop ? 9 : 8}
      axisSize={desktop ? 9 : 8}
      gutter={desktop ? 2 : 1.5}
      className={desktop ? "mt-[11px]" : "mt-[7px]"}
    />
  ) : null;

  const shell = `rounded-card-lg border overflow-hidden ${
    highlight ? "border-accent-border bg-accent-tint-card" : "border-card bg-surface"
  } ${onSelect ? "focus-ring cursor-pointer" : ""} ${className}`;

  if (desktop) {
    return (
      <div className={`${shell} flex flex-col min-h-0`} onClick={onSelect}>
        <div className="flex-1 min-h-0 relative">
          <CamFrame spot={spot} fill onFullscreen={onOpenCam} />
        </div>
        <div className="flex-none px-[14px] pt-[10px] pb-[11px]">
          {identity}
          {wind}
        </div>
      </div>
    );
  }

  return (
    <div className={`${shell} px-[11px] pt-[6px] pb-[7px]`} onClick={onSelect}>
      {identity}
      <div className="mt-2">
        <CamFrame spot={spot} radius={11} onFullscreen={onOpenCam} />
      </div>
      {wind}
    </div>
  );
}

/**
 * What the water is doing, in order of authority: the station if it is alive,
 * the forecast if it is not, and a plain statement of the gap if there is
 * neither.
 *
 * Saying nothing would be the worst option — a card with a cam and no numbers
 * looks like the numbers failed to load.
 */
function LiveReading({ pack, sport, slot, station: sensor, size }) {
  // Surf has no live readings anywhere. The sensors measure wind, and for surf
  // the cam is the only live evidence there is.
  const station = isWindSport(sport) ? sensor : null;
  if (station) {
    return (
      <WindLine
        metric={{
          value: Math.round(station.speed),
          unit: "kn",
          secondary: Number.isFinite(station.gust) ? `(${Math.round(station.gust)}*)` : null,
          directionLabel: station.directionLabel,
        }}
        size={size}
        className="block text-faded-ink mt-[3px]"
      />
    );
  }
  return (
    <WindLine
      slot={slot}
      sport={sport}
      // "station down" is only honest for a spot that HAS a sensor. For surf, or
      // for a beach that never had one, the forecast is simply what we have.
      suffix={isWindSport(sport) && pack.hasStationUrl ? "station down" : "forecast"}
      size={size}
      className="block text-dim mt-[3px]"
    />
  );
}

/** The legend, once, in the page header — not repeated on every card. */
export function LiveLegend({ live = true, className = "" }) {
  return (
    <div className={`flex gap-4 font-data text-[10px] ${className}`}>
      {live && <span className="text-ink">— station</span>}
      {live && (
        <span className="text-ink" style={{ opacity: 0.6 }}>
          -- gusts
        </span>
      )}
      <span className="text-accent">▮ forecast</span>
      <span className="text-now">| now</span>
    </div>
  );
}
