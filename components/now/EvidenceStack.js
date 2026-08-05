"use client";

import { CircleGauge, Layers, TrendingUp, TrendingDown, Users, Wind } from "lucide-react";
import { BANDS, agreementSentence } from "../../lib/agreement";
import { StationWindChart } from "./StationWindChart";
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
 */
export function StationCard({ station, bare = false }) {
  // "1 MIN AGO @ THE SPOT" — age and proximity share one meta line.
  const meta = [station.agoLabel, station.caption].filter(Boolean).join(" @ ");

  return (
    <div className={bare ? "" : CARD}>
      <div className="flex items-center gap-[9px]">
        <Wind size={15} className="text-accent" />
        <span className="font-data text-[10px] tracking-label text-accent">STATION</span>
        {meta && (
          <span className="ml-auto font-data text-[9px] text-dim truncate max-w-[70%] text-right">
            {meta}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-x-3 gap-y-1.5 mt-[11px]">
        <WindReading
          size="lg"
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

      {station.history?.length > 1 && <StationWindChart history={station.history} />}

      {station.history?.length > 1 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 font-data text-[9px] text-dim">
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
                className="inline-block w-3 h-0 border-t"
                style={{
                  borderColor: "var(--wm-dim)",
                  borderStyle: "dashed",
                  borderWidth: "1.5px 0 0",
                }}
              />
              forecast
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ModelAgreementCard({ agreement }) {
  const sentence = agreementSentence(agreement);

  return (
    <div className={CARD}>
      <div className="flex items-center gap-[9px]">
        <Layers size={15} className="text-faded-ink" />
        <span className="font-data text-[10px] tracking-label text-faded-ink">
          MODEL AGREEMENT
        </span>
      </div>
      <div className="flex items-center gap-[11px] mt-3">
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
