"use client";

import { CircleGauge, Layers, TrendingUp, TrendingDown, Users, Wind } from "lucide-react";
import { BANDS, agreementSentence } from "../../lib/agreement";

/**
 * "Why we think so" — the evidence under the verdict, ordered by how much a
 * rider trusts it: who is actually out, then what the station reads, then what
 * the models say.
 *
 * The stack must read as complete with only the cards it can fill. Most spots
 * have neither a cam nor a live station, and one honest card is a legitimate
 * screen — three skeletons that never resolve are not.
 */
export function EvidenceStack({ riderCount, station, agreement, reasoning, sportNoun = "out" }) {
  const cards = [
    riderCount && <InTheWaterCard key="water" reading={riderCount} sportNoun={sportNoun} />,
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

function InTheWaterCard({ reading, sportNoun }) {
  const Trend = reading.trend === "down" ? TrendingDown : TrendingUp;

  return (
    <div className={CARD}>
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

function StationCard({ station }) {
  const max = Math.max(...(station.history || []).map((p) => p.speed), 1);

  return (
    <div className={CARD}>
      <div className="flex items-center gap-[9px]">
        <Wind size={15} className="text-accent" />
        <span className="font-data text-[10px] tracking-label text-accent">STATION</span>
        {station.agoLabel && (
          <span className="ml-auto font-data text-[9px] text-dim">{station.agoLabel}</span>
        )}
      </div>

      <div className="flex items-end gap-2.5 mt-[11px]">
        <span className="font-data font-bold text-[38px] leading-none text-ink tabular-nums">
          {Math.round(station.speed)}
        </span>
        <span className="pb-1 font-data text-[12px] text-faded-ink">
          kn <span className="text-ink">{station.directionLabel}</span>
          {station.gust ? ` (${Math.round(station.gust)}*)` : ""}
        </span>
        {station.delta !== null && station.delta !== undefined && (
          <span className="ml-auto mb-1 bg-accent-tint rounded-pill px-[9px] py-[5px] font-data text-[10px] text-accent">
            {station.delta >= 0 ? "+" : ""}
            {Math.round(station.delta)} vs forecast
          </span>
        )}
      </div>

      {station.history?.length > 0 && (
        <div className="flex items-end gap-[3px] h-[26px] mt-[11px]" aria-hidden="true">
          {station.history.map((point, i) => {
            const ratio = point.speed / max;
            const shade =
              ratio > 0.8 ? "bg-accent" : ratio > 0.5 ? "bg-accent-mid" : "bg-accent-low";
            return (
              <span
                key={i}
                className={`flex-1 ${shade}`}
                style={{ height: `${Math.max(ratio * 100, 6)}%` }}
              />
            );
          })}
        </div>
      )}
      {station.caption && (
        <p className="font-data text-[9px] text-dim mt-[7px]">{station.caption}</p>
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
