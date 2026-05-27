"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_ANALYSIS_SEASON_ID,
  listAnalysisSeasonOptions,
} from "../../../lib/forecast-experiment/analysisSeasons.js";
import { formatForecastModelLabel } from "../../../lib/forecast-experiment/modelLabels.js";
import { formatLisbonDateTime, localDayWindowMs } from "../../../lib/forecast-experiment/time.js";
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
  defaultSeasonId = DEFAULT_ANALYSIS_SEASON_ID,
  showWindClimatology = true,
  showComparison = false,
  buildSummary = buildDefaultSummary,
}) {
  const seasonOptions = listAnalysisSeasonOptions();
  const [seasonId, setSeasonId] = useState(defaultSeasonId);
  const [result, setResult] = useState(undefined);
  const [loadError, setLoadError] = useState(null);

  const loadAnalysis = useCallback(
    async (nextSeasonId, signal) => {
      setResult(undefined);
      setLoadError(null);
      const params = new URLSearchParams({ season: nextSeasonId });
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
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 4 * 60 * 1000);

    loadAnalysis(seasonId, controller.signal)
      .then((payload) => {
        if (!controller.signal.aborted) setResult(payload);
      })
      .catch((error) => {
        if (controller.signal.aborted && !timedOut) return;
        if (error.name === "AbortError" && timedOut) {
          setLoadError("Analysis timed out. Try a single summer instead of Average.");
          return;
        }
        if (error.name === "AbortError") return;
        setLoadError(error.message);
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [seasonId, loadAnalysis]);

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

        <div className="mt-4 flex flex-wrap gap-2">
          {seasonOptions.map((option) => {
            const active = option.id === seasonId;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSeasonId(option.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-ink bg-ink text-white"
                    : "border-ink/15 text-ink/70 hover:bg-ink/5"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </header>

      {loading && (
        <p className="text-sm text-ink/60">
          Checking forecasts… large ranges can take a couple of minutes on first load.
        </p>
      )}
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

          <RideabilityAnomaliesSection
            anomalies={result?.rideabilityAnomalies}
            winnerModel={winner.model}
            formatLabel={formatForecastModelLabel}
          />

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

function RideabilityAnomaliesSection({ anomalies, winnerModel, formatLabel }) {
  if (!anomalies?.byModel) return null;

  const { thresholdKnots, daysScored, byModel } = anomalies;
  const modelRows = Object.entries(byModel)
    .map(([model, stats]) => ({ model, ...stats }))
    .sort(
      (a, b) =>
        b.falsePositiveCount +
        b.falseNegativeCount -
        (a.falsePositiveCount + a.falseNegativeCount)
    );

  const spotlight = byModel[winnerModel] ?? modelRows[0];
  const totalFp = modelRows.reduce((sum, row) => sum + row.falsePositiveCount, 0);
  const totalFn = modelRows.reduce((sum, row) => sum + row.falseNegativeCount, 0);

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-amber-950">Rideability surprises</h3>
      <p className="mt-2 text-sm leading-relaxed text-amber-950/90">
        Day-level mismatches at the {thresholdKnots}+ kt rideable bar (forecast P50 kick-in vs marina
        sustained crossing), across {daysScored} scored days.
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-amber-200/80 bg-white px-3 py-2">
          <dt className="text-[11px] uppercase tracking-wide text-ink/45">False positives</dt>
          <dd className="mt-1 text-sm text-ink">
            Forecast expected rideable wind, but the gauge never sustained {thresholdKnots}+ kt.
          </dd>
          <p className="mt-2 tabular-nums text-lg font-semibold text-amber-950">
            {totalFp} day{totalFp === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-md border border-amber-200/80 bg-white px-3 py-2">
          <dt className="text-[11px] uppercase tracking-wide text-ink/45">False negatives</dt>
          <dd className="mt-1 text-sm text-ink">
            The gauge reached rideable wind, but the forecast did not predict a kick-in.
          </dd>
          <p className="mt-2 tabular-nums text-lg font-semibold text-amber-950">
            {totalFn} day{totalFn === 1 ? "" : "s"}
          </p>
        </div>
      </dl>

      {spotlight &&
      (spotlight.falsePositiveCount > 0 || spotlight.falseNegativeCount > 0) ? (
        <div className="mt-4 rounded-md border border-amber-200/80 bg-white px-3 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink/45">
            {formatLabel(winnerModel)} examples
          </p>
          <AnomalyDayLists stats={spotlight} />
        </div>
      ) : null}

      {modelRows.some((row) => row.falsePositiveCount + row.falseNegativeCount > 0) ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[20rem] text-left text-sm">
            <thead>
              <tr className="border-b border-amber-200/80 text-[11px] uppercase tracking-wide text-ink/45">
                <th className="py-2 pr-3 font-medium">Model</th>
                <th className="py-2 px-3 font-medium">False +</th>
                <th className="py-2 pl-3 font-medium">False −</th>
              </tr>
            </thead>
            <tbody>
              {modelRows.map((row) => (
                <tr key={row.model} className="border-b border-amber-100/80 last:border-0">
                  <td className="py-2 pr-3 text-ink">{formatLabel(row.model)}</td>
                  <td className="py-2 px-3 tabular-nums text-ink/80">{row.falsePositiveCount}</td>
                  <td className="py-2 pl-3 tabular-nums text-ink/80">{row.falseNegativeCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function AnomalyDayLists({ stats }) {
  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-2">
      <AnomalyDayList
        title="False positive days"
        emptyLabel="None in sample"
        days={stats.falsePositives}
        renderDetail={(day) =>
          [
            day.maxObservedWindKnots != null
              ? `peak ${day.maxObservedWindKnots.toFixed(0)} kt`
              : null,
            day.predictedKickInAt
              ? `forecast kick-in ${formatLisbonDateTime(day.predictedKickInAt, { includeTime: true })}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")
        }
      />
      <AnomalyDayList
        title="False negative days"
        emptyLabel="None in sample"
        days={stats.falseNegatives}
        renderDetail={(day) =>
          [
            day.maxObservedWindKnots != null
              ? `peak ${day.maxObservedWindKnots.toFixed(0)} kt`
              : null,
            day.actualKickInAt
              ? `observed ${formatLisbonDateTime(day.actualKickInAt, { includeTime: true })}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")
        }
      />
    </div>
  );
}

function AnomalyDayList({ title, emptyLabel, days, renderDetail }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink/60">{title}</p>
      {days.length === 0 ? (
        <p className="mt-1 text-sm text-ink/45">{emptyLabel}</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-sm">
          {days.map((day) => (
            <li key={day.dateLocal} className="text-ink">
              <span className="font-medium">{formatAnomalyDayLabel(day.dateLocal)}</span>
              <span className="text-ink/60"> — {renderDetail(day)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatAnomalyDayLabel(dateLocal) {
  const { startAt } = localDayWindowMs(dateLocal);
  return formatLisbonDateTime(startAt + 12 * 3_600_000, { includeWeekday: true, includeTime: false });
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
