"use client";

import { isWindSport } from "../sport/SportProvider";
import {
  BandHeader,
  WIND_FORECAST_LEGEND,
  WIND_LIVE_LEGEND,
  waveTideLabel,
  waveTideLegend,
} from "./BandHeader";
import { ChartColumnHover } from "./ChartColumnHover";
import { NowLine, TimeAxis } from "./TimeAxis";
import { ScoreBand } from "./ScoreBand";
import { WaveTideBand, waveTidePresence } from "./WaveTideBand";
import { WindBand } from "./WindBand";

/**
 * The three-band panel: WIND, WAVES & TIDE, SCORE — one x-axis, one now line.
 *
 * No card around it. Three plots in three cards would be three charts that
 * happen to be near each other; a single ruled panel is one chart of a day, and
 * the shared now line is what lets you read "the wind builds after two, the
 * tide turns with it, and the score peaks at four" as one sentence.
 *
 * Bands are separated by a rule and 13px of air rather than by boxes, and each
 * keeps its own header so the legend for a band is next to that band.
 *
 * What is drawn depends on what exists, not on a layout:
 *   - no station (or a surf view) → no live traces, and the wind legend
 *     switches to base/gusts, because there is nothing live to contrast with.
 *   - no wave and no tide data → the middle band is dropped entirely rather
 *     than drawn empty. A flat line at zero is a claim about the sea.
 *   - no scores yet → the score band goes, and the panel is still a chart.
 */
export function DayChartPanel({
  chart,
  sport,
  station = null,
  tides = [],
  variant = "mobile",
  fluid = false,
  showScore = true,
  showWaves = true,
  /**
   * The forecast-only reading of the panel, used by the spot forecast: no live
   * wash and no now rule inside the plot. That screen already carries the now
   * marker on the day track above the chart, and repeating it inside would say
   * "live" about a chart that has no live data in it.
   */
  showWash = true,
  showNow = true,
  /** Hover tooltips on the column tops (Now). Off on forecast-only panels. */
  showHover = true,
  /** Real link target for SCORE numbers — `/report/[slug]?sport=…`. */
  reportHref = null,
  bandHeights,
  className = "",
  nowMs = Date.now(),
}) {
  const desktop = variant === "desktop";
  const size = desktop ? "md" : "sm";
  const labelSize = desktop ? 9.5 : 8.5;
  const h = bandHeights ?? {
    wind: desktop ? 120 : 88,
    waves: desktop ? 72 : 56,
    score: desktop ? 64 : 50,
  };
  // Surf has no station traces anywhere — the cam is the only live evidence.
  const live = isWindSport(sport) ? station : null;

  const water = waveTidePresence(chart, tides);
  const waves =
    showWaves && water.any ? (
      <WaveTideBand
        chart={chart}
        tides={tides}
        nowMs={nowMs}
        labelSize={labelSize}
        showWash={showWash}
        height={fluid ? undefined : h.waves}
        className={fluid ? "flex-1 min-h-0" : ""}
      />
    ) : null;

  const score = showScore ? (
    <ScoreBand
      chart={chart}
      height={fluid ? undefined : h.score}
      barRatio={desktop ? 0.55 : 0.52}
      numberSize={desktop ? 15 : 12}
      gutter={desktop ? 3 : 1.5}
      radius={desktop ? 4 : 3}
      reportHref={reportHref}
      className={fluid ? "flex-1 min-h-0" : ""}
    />
  ) : null;

  // Live knots live on the cam as LiveStationBadge (top-left overlay) — not
  // beside the Wind label — so the reading cannot disagree with a second copy
  // here.
  const windBand = (
    <>
      <BandHeader
        label="Wind"
        size={size}
        legend={live ? WIND_LIVE_LEGEND : WIND_FORECAST_LEGEND}
        className="pb-[7px]"
      />
      <div className={`relative overflow-visible ${fluid ? "flex-[1.5] min-h-0" : ""}`}>
        <WindBand
          chart={chart}
          station={live}
          labelSize={labelSize}
          showWash={showWash}
          gutter={desktop ? 3 : 2}
          radius={desktop ? 4 : 3}
          height={fluid ? undefined : h.wind}
          nowMs={nowMs}
          className={fluid ? "h-full min-h-0" : ""}
        />
        {showHover && <ChartColumnHover chart={chart} station={live} nowMs={nowMs} />}
      </div>
    </>
  );

  const waterBand = waves && (
    <>
      <BandHeader
        label={waveTideLabel(water)}
        size={size}
        legend={waveTideLegend(water)}
        className="pb-[7px]"
      />
      {waves}
    </>
  );

  // The leading band follows the sport. Wind sports lead with wind and keep the
  // water as context; surf leads with swell and treats wind as the quality
  // note. Same three bands, same axis — only the reading order changes, because
  // the first thing on a chart is what it is about.
  const surfLed = !isWindSport(sport) && waterBand;
  const first = surfLed ? waterBand : windBand;
  const second = surfLed ? windBand : waterBand;

  return (
    <div
      className={`relative ${fluid ? "flex flex-col" : ""} ${className}`}
      role="img"
      aria-label="Wind, waves and tide, and score across the day"
    >
      {first}

      {second && (
        <>
          <div className="border-t border-rule mt-[13px]" />
          <div className="pt-[13px]" />
          {second}
        </>
      )}

      {score && (
        <>
          <div className="border-t border-rule mt-[13px]" />
          <BandHeader label="Score" size={size} className="pt-[13px] pb-[7px]" />
          {score}
        </>
      )}

      {showNow && <NowLine chart={chart} top={desktop ? 18 : 16} bottom={desktop ? 24 : 20} />}

      <TimeAxis
        chart={chart}
        size={desktop ? 10 : 9}
        withMinutes={desktop}
        className="mt-[9px] pt-2 border-t border-rule"
      />
    </div>
  );
}

/**
 * The compact single-band version used on the Live cards: wind only, with the
 * station traces and its own axis. Live answers "what is happening", so waves,
 * tide and score would be three more things between the rider and the answer.
 */
export function WindOnlyChart({
  chart,
  sport,
  station,
  height = 38,
  labelSize = 8,
  axisSize = 8,
  gutter = 1.5,
  className = "",
}) {
  const live = isWindSport(sport) ? station : null;
  return (
    <div className={className}>
      <div className="relative" style={{ height }}>
        <WindBand
          chart={chart}
          station={live}
          height={height}
          labelSize={labelSize}
          gutter={gutter}
          radius={3}
        />
        <NowLine chart={chart} z={2} />
      </div>
      <TimeAxis chart={chart} size={axisSize} className="mt-[5px]" />
    </div>
  );
}
