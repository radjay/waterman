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
 *
 * Webcam-only spots (Guincho N, Moitas) have no forecast card — cam + name only.
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
  const camOnly = Boolean(spot.webcamOnly);

  const identity = (
    <div className={`flex items-center ${desktop ? "gap-[14px]" : "gap-3"}`}>
      {!camOnly &&
        (score === null ? (
          <ScoreDialEmpty size={desktop ? 46 : 42} />
        ) : (
          <ScoreDial
            score={score}
            size={desktop ? 46 : 42}
            ring={11}
            value={desktop ? 16 : 14}
            showAll
          />
        ))}
      <div className="flex-1 min-w-0">
        <div
          className={`font-headline font-bold tracking-display truncate ${
            camOnly || score !== null ? "text-ink" : "text-faded-ink"
          } ${desktop ? "text-[17px]" : "text-[16px]"}`}
        >
          {spot.name}
        </div>
        {!camOnly && (
          <LiveReading
            pack={pack}
            sport={sport}
            slot={slot}
            station={station}
            size={desktop ? 11.5 : 10.5}
          />
        )}
      </div>
    </div>
  );

  const wind =
    !camOnly && chart ? (
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

  // Same pack.station as the wind chart — CamFrame overlays LiveStationBadge
  // top-left when there is a reading; surfing / dead stations stay blank.
  // Windguru + Windy sit top-right (LIVE only) left of Maximize.
  // Webcam-only spots have no station line to show.
  const camStation = !camOnly && isWindSport(sport) ? station : null;

  if (desktop) {
    return (
      <div className={`${shell} flex flex-col`} onClick={onSelect}>
        <CamFrame
          spot={spot}
          station={camStation}
          showExternalLinks
          matchVideoAspect
          onFullscreen={onOpenCam}
        />
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
        <CamFrame
          spot={spot}
          station={camStation}
          showExternalLinks
          matchVideoAspect
          radius={11}
          onFullscreen={onOpenCam}
        />
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

/** @deprecated Page-level LIVE legend removed — kept for ui-kit reference only. */
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
