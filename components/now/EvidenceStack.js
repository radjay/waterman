"use client";

import {
  CircleGauge,
  Layers,
  TrendingUp,
  TrendingDown,
  Users,
  Wind,
  Waves,
  WavesArrowUp,
  WavesArrowDown,
} from "lucide-react";
import { BANDS, agreementSentence } from "../../lib/agreement";
import { getCardinalDirection, formatTideTime } from "../../lib/utils";
import { StationWindChart } from "./StationWindChart";
import { WaveTideChart } from "./WaveTideChart";
import { WindReading } from "./WindReading";

/**
 * "Why we think so" — the evidence under the verdict, ordered by how much a
 * rider trusts it: who is actually out, then what the station reads, then what
 * the models say.
 *
 * The stack must read as complete with only the cards it can fill. Most spots
 * have neither a cam nor a live station, and one honest card is a legitimate
 * screen — three skeletons that never resolve are not.
 */
export function EvidenceStack({ station, agreement, reasoning }) {
  const cards = [
    station && <StationCard key="station" station={station} />,
    agreement && agreement.band !== BANDS.UNKNOWN && (
      <ModelAgreementCard key="models" agreement={agreement} />
    ),
  ].filter(Boolean);

  // Most spots have no cam and no live station, and a spot with no per-model
  // rows yet contributes nothing either — which left the whole section missing
  // and the screen reduced to a verdict and a button. The scorer's own
  // explanation is real evidence and is always available, so it backstops the
  // stack rather than letting "why we think so" answer with silence.
  if (cards.length === 0 && reasoning) {
    cards.push(<ForecastCard key="forecast" reasoning={reasoning} />);
  }

  if (cards.length === 0) return null;

  return (
    <section className="pt-5">
      <h2 className="font-data text-[9px] tracking-label-wide text-dim mb-[11px]">
        WHY WE THINK SO
      </h2>
      <div className="flex flex-col gap-2">{cards}</div>
    </section>
  );
}

// 15px radius per the handoff; rounded-card-sm is 14px.
const CARD = "rounded-[15px] bg-surface border border-card px-[14px] py-[13px]";

function ForecastCard({ reasoning }) {
  return (
    <div className={CARD}>
      <div className="flex items-center gap-[9px]">
        <CircleGauge size={15} className="text-faded-ink" />
        <span className="font-data text-[10px] tracking-label text-faded-ink">FORECAST</span>
      </div>
      <p className="text-[13px] leading-[1.45] text-ink mt-[11px]">{reasoning}</p>
    </div>
  );
}

/**
 * Rider counts are a computer-vision estimate, not a measurement, and they are
 * fixtures until the model ships. That belongs in Labs on Now rather than in
 * "why we think so", where it sat above the station reading and outranked it.
 * Exported for that; `bare` drops the card chrome when it is already inside one.
 */
export function InTheWaterCard({ reading, sportNoun, bare = false }) {
  const Trend = reading.trend === "down" ? TrendingDown : TrendingUp;

  return (
    <div className={bare ? "" : CARD}>
      <div className="flex items-center gap-[9px]">
        <Users size={15} className="text-accent" />
        <span className="font-data text-[10px] tracking-label text-accent">IN THE WATER</span>
      </div>
      <div className="flex items-end gap-3 mt-[11px]">
        <span className="font-data font-bold text-[38px] leading-none text-ink tabular-nums">
          {reading.count}
        </span>
        <span className="pb-1">
          <span className="block text-[13px] text-ink">
            {reading.count === 0 ? "nobody out" : `${sportNoun} up`}
          </span>
          {reading.trend !== "steady" && (
            <span className="flex items-center gap-1 font-data text-[11px] text-accent mt-0.5">
              <Trend size={11} />
              from {reading.previous} an hour ago
            </span>
          )}
        </span>
      </div>
      {/* Deliberate wording. Never present the count as measured fact. */}
      <p className="font-data text-[9px] text-dim mt-[9px]">
        Estimated with our computer vision model from webcam footage
      </p>
    </div>
  );
}

/**
 * @param {boolean} bare - Drop card chrome so the block can sit flush under
 *   "WHY WE THINK SO" inside the verdict card (same inset as the prose).
 * @param {boolean} compactChart - Shorter sparkline for half-width hero layout.
 */
export function StationCard({ station, bare = false, compactChart = false }) {
  // "1 MIN AGO @ THE SPOT" — age and proximity share one meta line.
  const meta = [station.agoLabel, station.caption].filter(Boolean).join(" @ ");

  return (
    <div className={bare ? "h-full flex flex-col" : `${CARD} h-full flex flex-col`}>
      <div className="flex items-center gap-[9px]">
        <Wind size={15} className="text-accent" />
        <span className="font-data text-[10px] tracking-label text-accent">STATION</span>
        {meta && (
          <span className="ml-auto font-data text-[9px] text-dim truncate max-w-[70%] text-right">
            {meta}
          </span>
        )}
      </div>

      {/* Fixed metric band so the chart top (red guide) lines up with Waves. */}
      <div className="mt-[11px] min-h-[44px] flex flex-wrap items-end gap-x-3 gap-y-1.5">
        <WindReading
          size="md"
          metric={{
            value: Math.round(station.speed),
            unit: "kn",
            // Same "(14*)" treatment as timeslot cards.
            secondary:
              station.gust != null ? `(${Math.round(station.gust)}*)` : null,
            directionLabel: station.directionLabel,
          }}
        />
        {station.delta !== null && station.delta !== undefined && (
          <span className="sm:ml-auto mb-1 bg-accent-tint rounded-pill px-[9px] py-[5px] font-data text-[10px] text-accent">
            {station.delta >= 0 ? "+" : ""}
            {Math.round(station.delta)} vs forecast
          </span>
        )}
      </div>

      {station.history?.length > 1 && (
        <div className="mt-[11px]">
          {/* Legend position unchanged: top-right, −20px into the metric band. */}
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 -mt-5 mb-1 font-data text-[9px] text-dim">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-[2px] rounded-full bg-accent" />
              base
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-0 border-t border-dashed"
                style={{ borderColor: "rgb(var(--wm-accent) / 0.55)" }}
              />
              gust
            </span>
            {station.history.some((p) => Number.isFinite(p.forecast)) && (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-[2px]"
                  style={{ background: "rgb(var(--wm-ink) / 0.18)" }}
                />
                forecast
              </span>
            )}
          </div>
          <StationWindChart history={station.history} compact={compactChart} />
        </div>
      )}
    </div>
  );
}

/**
 * Swell + tides for the Now hero. Sits beside StationCard at half width.
 *
 * Headline is the current reading; the sparkline is forecast wave height with
 * high/low tide marks on the time axis (H solid, L dashed).
 *
 * @param {{
 *   waveHeight: number|null,
 *   wavePeriod: number|null,
 *   waveDirection: number|null,
 *   history?: Array<{ time: number, height: number, period?: number|null }>,
 *   tides?: Array<{ type: string, time: number, height?: number, timeStr?: string }>,
 *   chartTides?: Array<{ type: string, time: number, height?: number }>
 * }} waves
 * @param {boolean} compactChart - Match the half-width station sparkline height.
 */
export function WavesTideCard({ waves, bare = false, compactChart = false }) {
  if (!waves) return null;

  const hasWave =
    waves.waveHeight !== null &&
    waves.waveHeight !== undefined &&
    waves.waveHeight > 0;
  const history = waves.history ?? [];
  const chartTides = waves.chartTides ?? waves.tides ?? [];
  const tides = waves.tides ?? [];
  const hasChart = history.length >= 2;

  if (!hasWave && !hasChart && tides.length === 0) return null;

  const swellFrom =
    waves.waveDirection !== null && waves.waveDirection !== undefined
      ? getCardinalDirection(waves.waveDirection + 180)
      : null;

  return (
    <div className={bare ? "h-full flex flex-col" : `${CARD} h-full flex flex-col`}>
      <div className="flex items-center gap-[9px]">
        <Waves size={15} className="text-accent" />
        <span className="font-data text-[10px] tracking-label text-accent">
          WAVES & TIDES
        </span>
      </div>

      {/* Same min-height as Station's metric band so chart tops share one line. */}
      <div className="mt-[11px] min-h-[44px] flex items-end min-w-0">
        {hasWave ? (
          <WindReading
            size="md"
            metric={{
              value: Number(waves.waveHeight).toFixed(1),
              unit: "m",
              secondary: waves.wavePeriod != null
                ? `@ ${Math.round(waves.wavePeriod)}s`
                : null,
              directionLabel: swellFrom,
            }}
          />
        ) : (
          <p className="text-[13px] text-faded-ink">No swell data</p>
        )}
      </div>

      {hasChart && (
        <div className="mt-[11px]">
          {/* Legend position unchanged: top-right, −20px into the metric band. */}
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 -mt-5 mb-1 font-data text-[9px] text-dim">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-[2px] rounded-full bg-accent" />
              height
            </span>
            {(chartTides.some((t) => t.type === "high") ||
              chartTides.some((t) => t.type === "low")) && (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block w-0 h-2.5 border-l border-dashed"
                  style={{ borderColor: "var(--wm-dim)" }}
                />
                tide
              </span>
            )}
          </div>
          <WaveTideChart
            history={history}
            tides={chartTides}
            compact={compactChart}
          />
        </div>
      )}

      {/* When the chart is missing, fall back to the two-line tide list. */}
      {!hasChart && tides.length > 0 && (
        <ul className={`${hasWave ? "mt-3" : "mt-[11px]"} space-y-1.5`}>
          {tides.map((tide) => {
            const type = (tide.type || "").toLowerCase();
            const Icon = type === "high" ? WavesArrowUp : WavesArrowDown;
            const label = type === "high" ? "HIGH" : type === "low" ? "LOW" : "TIDE";
            const timeStr = tide.timeStr || formatTideTime(tide.time);
            const heightStr =
              tide.height !== null && tide.height !== undefined
                ? `${Number(tide.height).toFixed(1)}m`
                : null;
            return (
              <li
                key={`${tide.time}-${type}`}
                className="flex items-center gap-2 font-data text-[11px] tabular-nums text-ink"
              >
                <Icon size={13} className="text-faded-ink flex-none" />
                <span className="text-faded-ink tracking-label w-9 flex-none">{label}</span>
                <span className="flex-none">{timeStr}</span>
                {heightStr && (
                  <span className="ml-auto text-dim tabular-nums">{heightStr}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Model vote bars. `bare` drops the card chrome + title for use inside Labs.
 */
export function ModelAgreementCard({ agreement, bare = false }) {
  if (!agreement || agreement.band === BANDS.UNKNOWN) return null;

  const sentence = agreementSentence(agreement);

  return (
    <div className={bare ? "" : CARD}>
      {!bare && (
        <div className="flex items-center gap-[9px]">
          <Layers size={15} className="text-faded-ink" />
          <span className="font-data text-[10px] tracking-label text-faded-ink">
            MODEL AGREEMENT
          </span>
        </div>
      )}
      <div className={`flex items-center gap-[11px] ${bare ? "" : "mt-3"}`}>
        <span className="flex gap-1" aria-hidden="true">
          {agreement.models.map((model) => (
            <span
              key={model.model}
              className={`w-[26px] h-[7px] rounded-[2px] ${model.vote ? "bg-accent" : "bg-track"}`}
            />
          ))}
        </span>
        <span className="font-data text-[12px] text-ink">
          {agreement.agreed} of {agreement.total}
        </span>
      </div>
      {sentence && (
        <p className="text-[12px] leading-[1.4] text-faded-ink mt-[9px]">{sentence}</p>
      )}
    </div>
  );
}
