"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { MainLayout } from "../../../../components/layout/MainLayout";
import { ScoreDial } from "../../../../components/ui/ScoreDial";
import { ModelGrid, CriteriaPanel } from "../../../../components/confidence/ModelGrid";
import { ScoreFactors } from "../../../../components/confidence/ScoreFactors";
import { HourByHour } from "../../../../components/confidence/HourByHour";
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
import { detectWindows } from "../../../../lib/windows";
import { conditionSummary } from "../../../../lib/conditions";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const TZ = "Europe/Lisbon";
const THREE_HOURS = 3 * 60 * 60 * 1000;

const fmt = (ms, options) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...options }).format(new Date(ms));

export function ConfidenceContent({ dayStart, windowStart }) {
  const router = useRouter();
  const search = useSearchParams();
  const spotParam = search.get("spot");
  const { sport } = useSport();
  const showModels = useFlag("modelConfidence");
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const report = await client.query(api.spots.getReportData, { sports: [sport] });
        if (cancelled) return;

        // The spot is carried in the URL when we know it. Falling back to
        // "best score at this timestamp" is a guess, and a Confidence screen
        // showing another beach's numbers is worse than no screen.
        const candidates = spotsWithSlots(report, sport);
        let chosen = spotParam
          ? candidates.find(({ spot }) => spot._id === spotParam)
          : null;

        if (!chosen) {
          for (const candidate of candidates) {
            const slot = candidate.slots.find((s) => s.timestamp === windowStart);
            if (!slot) continue;
            const best = chosen?.slots.find((s) => s.timestamp === windowStart);
            if (!chosen || (slot.score ?? -1) > (best?.score ?? -1)) chosen = candidate;
          }
        }
        if (!chosen) {
          setState({ loading: false, error: null, data: null });
          return;
        }

        // Prefer the whole window over the single slot that was tapped: the
        // question is about a stretch of time, not an instant.
        const windows = detectWindows(chosen.slots);
        const window =
          windows.find((w) => windowStart >= w.start && windowStart < w.end) ?? null;

        const windowSlots = window
          ? window.slots
          : chosen.slots.filter(
              (s) => s.timestamp >= windowStart && s.timestamp < windowStart + THREE_HOURS
            );
        if (windowSlots.length === 0) {
          setState({ loading: false, error: null, data: null });
          return;
        }

        const peak = windowSlots.reduce(
          (best, s) => ((s.score ?? -1) > (best.score ?? -1) ? s : best),
          windowSlots[0]
        );

        const start = windowSlots[0].timestamp;
        const end = windowSlots[windowSlots.length - 1].timestamp + THREE_HOURS;

        const tides = (report.data?.[chosen.spot._id]?.tides ?? []).filter(
          (t) => t.time >= start && t.time <= end
        );

        // Live from the upstream via our own proxy. The grid needs the models'
        // current calls, not their history, so it does not depend on the Convex
        // ingest having been deployed and run.
        //
        // Additive either way: a failure degrades to "no model data", never to
        // an error on the page and never to a claim of disagreement.
        let modelRows = [];
        let sourceModel = null;
        if (chosen.spot.windySpotId) {
          try {
            const res = await fetch(`/api/models/${chosen.spot.windySpotId}`);
            if (res.ok) {
              const payload = await res.json();
              modelRows = (payload.models ?? []).flatMap(({ model, slots }) =>
                slots.map((slot) => ({ ...slot, model }))
              );
              sourceModel = payload.sourceModel ?? null;
            }
          } catch {
            modelRows = [];
          }
        }
        if (cancelled) return;

        setState({
          loading: false,
          error: null,
          data: {
            spot: chosen.spot,
            config: chosen.config,
            slots: windowSlots,
            peak,
            start,
            end,
            tides,
            modelRows,
            sourceModel,
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
  }, [sport, windowStart, spotParam]);

  const { loading, error, data } = state;
  const windSport = isWindSport(sport);

  const model = useMemo(() => {
    if (!data) return null;
    const byTime = groupByTimestamp(data.modelRows);
    const threshold = thresholdFor(data.config, sport);
    const columns = data.slots.map((s) => ({
      timestamp: s.timestamp,
      label: fmt(s.timestamp, { hour: "2-digit" }),
    }));
    const perColumn = columns.map((c) =>
      threshold ? agreementFor(byTime.get(c.timestamp) || [], threshold) : null
    );
    const names = [...new Set(data.modelRows.map((r) => r.model))];
    return {
      columns,
      perColumn,
      models: names.map((name) => ({
        model: name,
        votes: perColumn.map((a) => a?.models.find((m) => m.model === name)?.vote ?? null),
      })),
      agreedByColumn: perColumn.map((a) => a?.agreed ?? 0),
      // The headline describes the window's BEST hour, not its first. Reading
      // column zero meant a window peaking at 16:00 was summarised by 10:00,
      // when nothing is on yet — so a strong window reported "0 of 5".
      windowAgreement:
        perColumn[columns.findIndex((c) => c.timestamp === data.peak.timestamp)] ??
        perColumn.reduce(
          (best, a) => ((a?.agreed ?? -1) > (best?.agreed ?? -1) ? a : best),
          perColumn[0]
        ),
    };
  }, [data, sport]);

  const criteria = data && !windSport ? surfCriteria(data.peak, data.config, null) : [];
  const surfLabel = criteria.length ? surfConfidenceLabel(criteria) : null;
  const confidence = windSport
    ? confidenceFrom(model?.windowAgreement, data?.peak?.score)
    : (surfLabel ?? confidenceFrom(null, data?.peak?.score));

  return (
    <MainLayout wide>
      <header className="flex items-center gap-[11px] pt-[22px] pb-2.5">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="text-faded-ink hover:text-ink transition-colors duration-fast ease-smooth focus-ring"
        >
          <ArrowLeft size={17} />
        </button>
        <span className="font-data text-[10px] tracking-label text-faded-ink uppercase truncate">
          {data?.spot?.name ?? "Window"} · {fmt(windowStart, { weekday: "short" })}{" "}
          {fmt(data?.start ?? windowStart, { hour: "2-digit", minute: "2-digit" })}–
          {fmt(data?.end ?? windowStart + THREE_HOURS, { hour: "2-digit", minute: "2-digit" })}
        </span>
      </header>

      {loading && (
        <div className="animate-pulse" aria-hidden="true">
          <div className="flex items-center gap-3.5 pt-2">
            <div className="h-[74px] w-[74px] rounded-full bg-surface flex-none" />
            <div className="flex-1">
              <div className="h-5 w-40 bg-surface rounded" />
              <div className="h-3 w-56 bg-surface rounded mt-2.5" />
            </div>
          </div>
          <div className="rounded-[15px] bg-surface border border-card h-[140px] mt-7" />
          <div className="rounded-[15px] bg-surface border border-card h-[180px] mt-6" />
        </div>
      )}

      {!loading && (error || !data) && (
        <div className="rounded-card-lg border border-card bg-surface p-5">
          <p className="text-[14px] text-faded-ink leading-[1.5]">
            {error
              ? "Cannot reach the forecast. This is a connection problem, not an empty window."
              : "That window is no longer in the forecast. Scrapes roll forward every few hours, so it may simply have passed."}
          </p>
          <button
            onClick={() => router.push("/next")}
            className="mt-3 font-data text-[11px] tracking-label text-accent focus-ring"
          >
            BACK TO NEXT WINDOWS
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="flex items-center gap-3.5 pt-2">
            {/* The only place the numeric score appears at any size. */}
            <ScoreDial score={data.peak.score} size="lg" showAll label="PEAK" />
            <div className="min-w-0">
              <div className="font-headline font-extrabold text-[25px] tracking-display-tight leading-[1.05] text-ink">
                {confidence.label}
              </div>
              <p className="text-[13px] text-faded-ink mt-1.5 leading-[1.4]">{confidence.reason}</p>
              <p className="font-data text-[11px] text-accent mt-1.5 uppercase truncate">
                {conditionSummary(data.peak, sport, { gust: true }) ?? ""}
              </p>
            </div>
          </div>

          <ScoreFactors factors={data.peak.factors} reasoning={data.peak.reasoning} />

          <HourByHour slots={data.slots} sport={sport} tides={data.tides} />

          {windSport && showModels && model?.models.length > 0 && (
            <ModelGrid
              columns={model.columns}
              models={model.models}
              agreedByColumn={model.agreedByColumn}
              outlier={model.windowAgreement?.outlier ?? null}
              sentence={agreementSentence(model.windowAgreement)}
              sourceModel={data.sourceModel}
            />
          )}

          {!windSport && criteria.length > 0 && (
            <CriteriaPanel criteria={criteria} windAgreement={model?.windowAgreement} />
          )}

          {/* A footnote, not a section. Absent model data is worth stating once
              so nobody reads the screen as a full picture — but it is not the
              answer to "do I believe it", and it used to be the whole page. */}
          {windSport && showModels && !model?.models.length && (
            <p className="font-data text-[9px] text-dim mt-6 leading-[1.6]">
              NO PER-MODEL COMPARISON FOR THIS SPOT YET — NOT THE SAME AS THE MODELS DISAGREEING.
            </p>
          )}
        </>
      )}
    </MainLayout>
  );
}

/**
 * Confidence reads from model agreement when we have it, and from the score
 * itself when we do not — rather than reporting "Unknown" on a screen that is
 * showing a scored window, a per-dimension breakdown and an hourly table.
 */
function confidenceFrom(agreement, score) {
  if (agreement && agreement.band !== BANDS.UNKNOWN) {
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

  if (score === null || score === undefined) {
    return { label: "Not scored", reason: "This window has not been scored yet." };
  }
  if (score >= 80) {
    return { label: "Strong window", reason: "Scored well across the whole window." };
  }
  if (score >= 60) {
    return { label: "Worth a look", reason: "Clears the bar, without much margin." };
  }
  return { label: "Marginal", reason: "Below the threshold for a good session." };
}
