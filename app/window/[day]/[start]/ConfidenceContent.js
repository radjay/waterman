"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { MainLayout } from "../../../../components/layout/MainLayout";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { ScoreDial } from "../../../../components/ui/ScoreDial";
import { ModelGrid, CriteriaPanel } from "../../../../components/confidence/ModelGrid";
import { LabsSection } from "../../../../components/ui/LabsSection";
import { ScoreFactors } from "../../../../components/confidence/ScoreFactors";
import { HourByHour } from "../../../../components/confidence/HourByHour";
import { useSport, isWindSport } from "../../../../components/sport/SportProvider";
import { useFlag } from "../../../../components/flags/FlagProvider";
import { LiveEvidencePanel } from "../../../../components/confidence/LiveEvidencePanel";
import {
  agreementFor,
  agreementSentence,
  groupByTimestamp,
  thresholdFor,
} from "../../../../lib/agreement";
import { surfConfidenceLabel, surfCriteria } from "../../../../lib/surfCriteria";
import { spotsWithSlots } from "../../../../lib/reportData";
import { detectWindows, isChartedSlot } from "../../../../lib/windows";
import { scoreTier } from "../../../../lib/scoreShade";
import { conditionSummary } from "../../../../lib/conditions";
import { classifyProximity, stationIdFromUrl } from "../../../../lib/stations";
import { buildStationCard } from "../../../../lib/station";
import { dtf } from "../../../../lib/datetime";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const TZ = "Europe/Lisbon";
const THREE_HOURS = 3 * 60 * 60 * 1000;

const fmt = (ms, options) =>
  dtf("en-GB", { timeZone: TZ, ...options }).format(new Date(ms));

export function ConfidenceContent({ dayStart, windowStart }) {
  const search = useSearchParams();
  const spotParam = search.get("spot");
  const { sport } = useSport();
  const showModels = useFlag("modelConfidence");
  const showStation = useFlag("stationEvidence");
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
        const windows = detectWindows(chosen.slots.filter((s) => isChartedSlot(s.timestamp)));
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

        // Same live trail as Now — optional, never fails the page.
        let station = null;
        if (showStation) {
          const stationId = stationIdFromUrl(chosen.spot.liveReportUrl);
          if (stationId) {
            try {
              const now = Date.now();
              const readings = await client.query(api.stations.getStationReadings, {
                stationId,
                sinceAt: now - 6 * 60 * 60 * 1000,
              });
              station = buildStationCard({
                readings,
                forecastSlot: peak,
                forecastSlots: chosen.slots,
                proximity: classifyProximity(stationId, chosen.spot),
                nowMs: now,
              });
            } catch {
              station = null;
            }
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
            spotSlots: chosen.slots,
            station,
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
  }, [sport, windowStart, spotParam, showStation]);

  const { loading, error, data } = state;
  const windSport = isWindSport(sport);

  const model = useMemo(() => {
    if (!data) return null;
    const byTime = groupByTimestamp(data.modelRows);
    // Calibrated from this spot's own scored slots, not just the window's —
    // a handful of hours is too few to learn a bar from.
    const threshold = thresholdFor(data.config, sport, data.spotSlots);
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
  const confidence = data
    ? (surfLabel ?? confidenceFromScore(data.peak.score, data.peak.factors))
    : { label: "", reason: "" };

  return (
    <MainLayout>
      <PageHeader
        title={data?.spot?.name ?? (loading ? "…" : "Window")}
        backHref="/next"
        subtitle={
          data ? (
            <span className="font-data text-ink tabular-nums">
              <span className="font-bold text-ink">{fmt(windowStart, { weekday: "long" })}</span>
              <span className="text-faded-ink mx-1.5">·</span>
              <span className="text-ink">
                {fmt(data.start, { hour: "2-digit", minute: "2-digit" })}–
                {fmt(data.end, { hour: "2-digit", minute: "2-digit" })}
              </span>
            </span>
          ) : null
        }
      />

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
          {/* Header already has back — this is recovery copy, not a second back. */}
          <p className="mt-3 text-[13px] text-faded-ink">
            Use the back arrow to return to next windows.
          </p>
        </div>
      )}

      {!loading && !error && data && (
        <div className="flex flex-col gap-6 pb-6">
          {/* 1. Verdict — is this window good? */}
          <div className="flex items-center gap-3.5">
            <ScoreDial score={data.peak.score} size="lg" showAll />
            <div className="min-w-0">
              <div className="font-headline font-extrabold text-[25px] tracking-display-tight leading-[1.05] text-ink">
                {confidence.label}
              </div>
              <p className="text-[13px] text-faded-ink mt-1 leading-[1.4] line-clamp-2">
                {confidence.reason}
              </p>
              <p className="font-data text-[12px] font-bold text-ink mt-1.5 tabular-nums">
                {conditionSummary(data.peak, sport, { gust: true }) ?? ""}
              </p>
            </div>
          </div>

          {/* 2. Shape of the session */}
          <HourByHour
            slots={data.slots}
            sport={sport}
            tides={data.tides}
            peakTimestamp={data.peak.timestamp}
          />

          {/* 3. Live check — station first, cam as a short preview */}
          <LiveEvidencePanel
            spot={data.spot}
            station={data.station}
            score={data.peak.score}
          />

          {/* 4. Why the score */}
          <ScoreFactors factors={data.peak.factors} reasoning={data.peak.reasoning} />

          {/* 5. Labs */}
          {windSport && showModels && model?.models.length > 0 && (
            <LabsSection
              title="Model comparison"
              caption={`${model.models.length} models · ${agreementSentence(model.windowAgreement) ?? ""}`}
            >
              <ModelGrid
                columns={model.columns}
                models={model.models}
                agreedByColumn={model.agreedByColumn}
                outlier={model.windowAgreement?.outlier ?? null}
                sentence={agreementSentence(model.windowAgreement)}
                sourceModel={data.sourceModel}
              />
            </LabsSection>
          )}

          {!windSport && criteria.length > 0 && (
            <CriteriaPanel criteria={criteria} windAgreement={model?.windowAgreement} />
          )}
        </div>
      )}
    </MainLayout>
  );
}

/**
 * Confidence from the score, and from what the scorer itself weighed.
 *
 * It deliberately does NOT read model agreement. The models are a curiosity,
 * not the verdict, and deriving the headline from them made a Labs readout
 * into the reason for the answer — while also letting a five-model quorum
 * override a score the rest of the app trusts.
 *
 * Vocabulary matches the week strip's tiers so a reader who has learned what
 * "great" looks like there meets the same word here.
 */
const TIER_LABEL = {
  epic: "Epic window",
  great: "Great window",
  good: "Good window",
  fair: "Worth a look",
  marginal: "Marginal",
};

function confidenceFromScore(score, factors) {
  if (score === null || score === undefined) {
    return { label: "Not scored", reason: "This window has not been scored yet." };
  }

  const label = TIER_LABEL[scoreTier(score)?.id] ?? "Marginal";

  // Name the weakest dimension rather than restating the number. "Tide is the
  // limiting factor" tells a rider something the score alone cannot.
  const named = [
    ["wind", factors?.windQuality],
    ["wave", factors?.waveQuality],
    ["tide", factors?.tideQuality],
  ].filter(([, v]) => v !== null && v !== undefined);

  if (named.length >= 2) {
    const sorted = [...named].sort((a, b) => a[1] - b[1]);
    const [weakName, weakValue] = sorted[0];
    const [strongName, strongValue] = sorted[sorted.length - 1];

    if (strongValue - weakValue >= 20) {
      return { label, reason: `${cap(strongName)} is the strength; ${weakName} is what holds it back.` };
    }
    return { label, reason: `Wind, wave and tide all line up.` };
  }

  if (score >= 80) return { label, reason: "Scored well across the whole window." };
  if (score >= 60) return { label, reason: "Clears the bar, without much margin." };
  return { label, reason: "Below the threshold for a good session." };
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
