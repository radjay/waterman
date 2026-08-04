"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { MainLayout } from "../../../../components/layout/MainLayout";
import { ScoreDial } from "../../../../components/ui/ScoreDial";
import { ModelGrid, CriteriaPanel } from "../../../../components/confidence/ModelGrid";
import { useSport, isWindSport } from "../../../../components/sport/SportProvider";
import { useFlag } from "../../../../components/flags/FlagProvider";
import {
  BANDS,
  agreementFor,
  agreementSentence,
  groupByTimestamp,
  thresholdFor,
} from "../../../../lib/agreement";
import { surfConfidenceLabel, surfCriteria } from "../../../../lib/surfCriteria";
import { spotsWithSlots } from "../../../../lib/reportData";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const TZ = "Europe/Lisbon";
const THREE_HOURS = 3 * 60 * 60 * 1000;

const fmt = (ms, options) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...options }).format(new Date(ms));

export function ConfidenceContent({ dayStart, windowStart }) {
  const router = useRouter();
  const { sport } = useSport();
  const showModels = useFlag("modelConfidence");
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const report = await client.query(api.spots.getReportData, { sports: [sport] });
        if (cancelled) return;

        // The window belongs to whichever spot has the best score at its start.
        let best = null;
        for (const { spot, slots, config } of spotsWithSlots(report, sport)) {
          const slot = slots.find((s) => s.timestamp === windowStart);
          if (!slot) continue;
          if (!best || (slot.score ?? -1) > (best.slot.score ?? -1)) {
            best = { spot, slot, slots, config };
          }
        }

        if (!best) {
          setState({ loading: false, error: null, data: null });
          return;
        }

        // Five 3-hour columns starting at the window.
        const columns = Array.from({ length: 5 }, (_, i) => {
          const timestamp = windowStart + i * THREE_HOURS;
          return { timestamp, label: fmt(timestamp, { hour: "2-digit" }) };
        });

        let modelRows = [];
        try {
          modelRows = await client.query(api.models.getModelSlotsForSpot, {
            spotId: best.spot._id,
            sinceTimestamp: windowStart,
          });
        } catch {
          modelRows = [];
        }
        if (cancelled) return;

        const byTime = groupByTimestamp(modelRows);
        const threshold = thresholdFor(best.config, sport);

        const perColumn = columns.map((c) =>
          threshold ? agreementFor(byTime.get(c.timestamp) || [], threshold) : null
        );

        const modelNames = [
          ...new Set(modelRows.map((r) => r.model)),
        ];
        const models = modelNames.map((model) => ({
          model,
          votes: columns.map((c) => {
            const entry = perColumn.find((_, i) => columns[i].timestamp === c.timestamp);
            return entry?.models.find((m) => m.model === model)?.vote ?? null;
          }),
        }));

        const windowAgreement = perColumn[0];

        setState({
          loading: false,
          error: null,
          data: {
            spot: best.spot,
            slot: best.slot,
            config: best.config,
            columns,
            models,
            agreedByColumn: perColumn.map((a) => a?.agreed ?? 0),
            windowAgreement,
            outlier: windowAgreement?.outlier ?? null,
          },
        });
      } catch (error) {
        if (cancelled) return;
        setState({ loading: false, error, data: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sport, windowStart]);

  const { loading, error, data } = state;
  const windSport = isWindSport(sport);

  const criteria = data && !windSport ? surfCriteria(data.slot, data.config, null) : [];
  const surfLabel = criteria.length ? surfConfidenceLabel(criteria) : null;

  const confidence = windSport
    ? confidenceFromAgreement(data?.windowAgreement)
    : surfLabel;

  return (
    <MainLayout wide>
      <header className="flex items-center gap-[11px] pt-[22px] pb-2.5">
        <button onClick={() => router.back()} aria-label="Back" className="text-faded-ink focus-ring">
          <ArrowLeft size={17} />
        </button>
        <span className="font-data text-[10px] tracking-label text-faded-ink uppercase">
          {data?.spot?.name ?? "Window"} · {fmt(windowStart, { weekday: "short" })}{" "}
          {fmt(windowStart, { hour: "2-digit", minute: "2-digit" })}–
          {fmt(windowStart + THREE_HOURS, { hour: "2-digit", minute: "2-digit" })}
        </span>
      </header>

      {loading && (
        <div className="animate-pulse" aria-hidden="true">
          <div className="h-[74px] w-[74px] rounded-full bg-surface" />
          <div className="rounded-card bg-surface border border-card h-[200px] mt-6" />
        </div>
      )}

      {!loading && (error || !data) && (
        <div className="rounded-card-lg border border-card bg-surface p-5">
          <p className="text-[14px] text-faded-ink">
            {error
              ? "Cannot reach the forecast. This is a connection problem, not an empty window."
              : "That window is no longer in the forecast."}
          </p>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="flex items-center gap-3.5 pt-2">
            {/* The only place the numeric score appears at any size. */}
            <ScoreDial score={data.slot.score} size="lg" showAll label="SCORE" />
            <div>
              <div className="font-headline font-extrabold text-[25px] tracking-display-tight leading-[1.05] text-ink">
                {confidence?.label ?? "Unknown"}
              </div>
              <p className="text-[13px] text-faded-ink mt-1.5 leading-[1.4]">
                {confidence?.reason ?? "Not enough evidence to say."}
              </p>
            </div>
          </div>

          {windSport && showModels && data.models.length > 0 && (
            <ModelGrid
              columns={data.columns}
              models={data.models}
              agreedByColumn={data.agreedByColumn}
              outlier={data.outlier}
              sentence={agreementSentence(data.windowAgreement)}
            />
          )}

          {windSport && showModels && data.models.length === 0 && (
            // Explicitly "no model data", never "models split". Absence of
            // evidence and evidence of disagreement are different answers.
            <section className="pt-[22px]">
              <h2 className="font-data text-[9px] tracking-label-wide text-dim mb-2.5">
                WHEN EACH MODEL SAYS GO
              </h2>
              <div className="rounded-card-sm border border-card bg-surface px-[14px] py-[13px]">
                <p className="text-[12px] text-faded-ink">
                  No per-model data for this spot yet. That is not the same as the models
                  disagreeing — we simply have nothing to compare.
                </p>
              </div>
            </section>
          )}

          {!windSport && (
            <CriteriaPanel criteria={criteria} windAgreement={data.windowAgreement} />
          )}
        </>
      )}
    </MainLayout>
  );
}

function confidenceFromAgreement(agreement) {
  if (!agreement || agreement.band === BANDS.UNKNOWN) {
    return { label: "Unknown", reason: "No per-model data for this spot yet." };
  }
  if (agreement.band === BANDS.GOOD) {
    return {
      label: "High confidence",
      reason: `${agreement.agreed} of ${agreement.total} models agree.`,
    };
  }
  if (agreement.band === BANDS.SPLIT) {
    return {
      label: "Models split",
      reason: `Only ${agreement.agreed} of ${agreement.total} call it on.`,
    };
  }
  return {
    label: "Low confidence",
    reason: `${agreement.agreed} of ${agreement.total} models call it on.`,
  };
}
