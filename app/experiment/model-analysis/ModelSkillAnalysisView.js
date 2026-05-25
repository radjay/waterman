"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatForecastModelLabel } from "../../../lib/forecast-experiment/modelLabels.js";
import { ForecastAccuracySection } from "./ForecastAccuracyCharts.js";
import { HorizontalMaeChart, WindSpeedRegimeBreakdown } from "./ModelSkillCharts.js";

function fmtKt(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "—";
}

export default function ModelSkillAnalysisView({
  title,
  description,
  apiFilter = "all",
  minKt = 12,
  defaultStart,
  defaultEnd,
  rangePresets,
  showWindClimatology = true,
  showComparison = false,
  buildSummary = buildDefaultSummary,
}) {
  const [startDateLocal, setStartDateLocal] = useState(defaultStart);
  const [endDateLocal, setEndDateLocal] = useState(defaultEnd);
  const [result, setResult] = useState(undefined);
  const [loadError, setLoadError] = useState(null);

  const loadAnalysis = useCallback(
    async (start, end, signal) => {
      setResult(undefined);
      setLoadError(null);
      const params = new URLSearchParams({ start, end });
      if (apiFilter !== "all") {
        params.set("filter", apiFilter);
        params.set("minKt", String(minKt));
      }
      const response = await fetch(`/api/experiment/wind-model-backtest?${params}`, { signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Failed to load analysis");
      if (!payload.ok) throw new Error(payload.error ?? "No analysis data");
      return payload;
    },
    [apiFilter, minKt]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadAnalysis(startDateLocal, endDateLocal, controller.signal)
      .then((payload) => {
        if (!controller.signal.aborted) setResult(payload);
      })
      .catch((error) => {
        if (controller.signal.aborted || error.name === "AbortError") return;
        setLoadError(error.message);
      });
    return () => controller.abort();
  }, [startDateLocal, endDateLocal, loadAnalysis]);

  const analysis = result?.analysis ?? null;
  const winner = analysis?.models[0] ?? null;
  const runnerUp = analysis?.models[1] ?? null;
  const loading = result === undefined && loadError == null;

  const rankingRows = useMemo(
    () =>
      analysis?.models.map((row) => ({
        key: row.model,
        value: row.effectiveMae,
      })) ?? [],
    [analysis]
  );

  const summary = buildSummary({
    winner,
    runnerUp,
    window: result?.window,
    comparison: result?.comparison,
    formatLabel: formatForecastModelLabel,
    minKt,
  });

  return (
    <div className="space-y-6">
      <header className="rounded-lg border border-ink/15 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-ink/60">{description}</p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="block text-ink/50">From</span>
            <input
              type="date"
              value={startDateLocal}
              onChange={(event) => setStartDateLocal(event.target.value)}
              className="mt-1 rounded border border-ink/20 px-2 py-1"
            />
          </label>
          <label className="text-sm">
            <span className="block text-ink/50">To</span>
            <input
              type="date"
              value={endDateLocal}
              onChange={(event) => setEndDateLocal(event.target.value)}
              className="mt-1 rounded border border-ink/20 px-2 py-1"
            />
          </label>
          <div className="flex flex-wrap gap-2 pb-1">
            {rangePresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setStartDateLocal(preset.start);
                  setEndDateLocal(preset.end);
                }}
                className="rounded border border-ink/15 px-2 py-1 text-xs text-ink/70 hover:bg-ink/5"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {loading && <p className="text-sm text-ink/60">Checking forecasts…</p>}
      {loadError && <p className="text-sm text-red-700">{loadError}</p>}
      {!loading && !analysis && !loadError && (
        <p className="text-sm text-ink/60">No data for these dates.</p>
      )}

      {analysis && winner && summary && (
        <>
          {showComparison && result?.comparison ? (
            <FilterComparisonCard comparison={result.comparison} formatLabel={formatForecastModelLabel} />
          ) : null}

          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-800/80">Winner</p>
            <h3 className="mt-1 text-xl font-semibold text-emerald-950">
              {formatForecastModelLabel(winner.model)}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-emerald-950">{summary.headline}</p>
            {summary.runnerUpLine ? (
              <p className="mt-2 text-sm text-emerald-900/80">{summary.runnerUpLine}</p>
            ) : null}
          </section>

          <section className="rounded-lg border border-ink/15 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold">The scoreboard</h3>
            <p className="mt-1 text-xs text-ink/50">
              {showComparison
                ? `Average knots wrong on nortada hours at ${minKt}+ kt — lower is better`
                : "Average knots wrong each hour — lower is better"}
            </p>
            <div className="mt-4">
              <HorizontalMaeChart
                title=""
                rows={rankingRows}
                formatLabel={formatForecastModelLabel}
                highlightKey={winner.model}
              />
            </div>
          </section>

          {showWindClimatology ? (
            <WindSpeedRegimeBreakdown climatology={result?.windClimatology} />
          ) : null}

          <ForecastAccuracySection
            chartData={analysis.chartData}
            modelRows={analysis.models}
            formatLabel={formatForecastModelLabel}
          />
        </>
      )}
    </div>
  );
}

function FilterComparisonCard({ comparison, formatLabel }) {
  const {
    minObservedEffectiveKnots,
    daysInRange,
    windyNortadaDays,
    allHourSamples,
    filteredHourSamples,
    allHoursWinner,
    filteredWinner,
    maeImprovementKt,
  } = comparison;

  const improved =
    Number.isFinite(maeImprovementKt) && maeImprovementKt > 0.05;
  const worse =
    Number.isFinite(maeImprovementKt) && maeImprovementKt < -0.05;

  return (
    <section className="rounded-lg border border-sky-200 bg-sky-50 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-sky-950">Filtered vs all hours</h3>
      <p className="mt-2 text-sm leading-relaxed text-sky-950/90">
        Scoring only <strong className="font-medium">nortada</strong> hours when the gauge read{" "}
        <strong className="font-medium">{minObservedEffectiveKnots}+ kt</strong>, on days that reached that
        bar at least once ({windyNortadaDays} of {daysInRange} days, {filteredHourSamples} hours vs{" "}
        {allHourSamples} all-condition hours).
      </p>
      {allHoursWinner && filteredWinner ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-sky-200/80 bg-white px-3 py-2 text-sm">
            <p className="text-[11px] uppercase tracking-wide text-ink/45">All hours (main page)</p>
            <p className="mt-1 font-medium text-ink">{formatLabel(allHoursWinner.model)}</p>
            <p className="tabular-nums text-ink/70">{fmtKt(allHoursWinner.effectiveMae)} kt typical miss</p>
          </div>
          <div className="rounded-md border border-sky-200/80 bg-white px-3 py-2 text-sm">
            <p className="text-[11px] uppercase tracking-wide text-ink/45">Windy nortada only</p>
            <p className="mt-1 font-medium text-ink">{formatLabel(filteredWinner.model)}</p>
            <p className="tabular-nums text-ink/70">{fmtKt(filteredWinner.effectiveMae)} kt typical miss</p>
          </div>
        </div>
      ) : null}
      {Number.isFinite(maeImprovementKt) ? (
        <p
          className={`mt-3 text-sm ${
            improved ? "text-emerald-800" : worse ? "text-amber-900" : "text-sky-900/80"
          }`}
        >
          {improved
            ? `Best model improves by ${fmtKt(maeImprovementKt)} kt on average when focusing on windy nortada — forecasts align better on rideable nortada.`
            : worse
              ? `Best model is ${fmtKt(Math.abs(maeImprovementKt))} kt worse on windy nortada only — filtering does not tighten alignment for the overall winner.`
              : "Typical miss is about the same whether or not you filter to windy nortada hours."}
        </p>
      ) : null}
    </section>
  );
}

function buildDefaultSummary({ winner, runnerUp, window, formatLabel }) {
  if (!winner) return null;

  const miss = fmtKt(winner.effectiveMae);
  const headline = `On average it was ${miss} knots off what the gauge actually showed. That is the closest of all the models we tested.`;

  let runnerUpLine = null;
  if (runnerUp && Number.isFinite(runnerUp.effectiveMae) && Number.isFinite(winner.effectiveMae)) {
    const gap = runnerUp.effectiveMae - winner.effectiveMae;
    if (gap > 0.05) {
      runnerUpLine = `${formatLabel(runnerUp.model)} was next best, but ${fmtKt(gap)} knots further away on average.`;
    }
  }

  if (window?.daysAnalyzed) {
    runnerUpLine = [runnerUpLine, `Based on ${window.daysAnalyzed} days of marina wind readings.`]
      .filter(Boolean)
      .join(" ");
  }

  return { headline, runnerUpLine };
}

export function buildWindyNortadaSummary({ winner, runnerUp, comparison, formatLabel, minKt }) {
  if (!winner) return null;

  const miss = fmtKt(winner.effectiveMae);
  const headline = `On windy nortada hours (${minKt}+ kt), the best model was typically ${miss} knots off the gauge.`;

  let runnerUpLine = null;
  if (runnerUp && Number.isFinite(runnerUp.effectiveMae) && Number.isFinite(winner.effectiveMae)) {
    const gap = runnerUp.effectiveMae - winner.effectiveMae;
    if (gap > 0.05) {
      runnerUpLine = `${formatLabel(runnerUp.model)} was next best on these hours, ${fmtKt(gap)} kt further away.`;
    }
  }

  if (comparison?.windyNortadaDays != null) {
    runnerUpLine = [
      runnerUpLine,
      `${comparison.windyNortadaDays} windy nortada days out of ${comparison.daysInRange} in this range.`,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return { headline, runnerUpLine };
}
