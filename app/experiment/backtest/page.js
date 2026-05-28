"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import {
  BACKTEST_CHART_END_HOUR,
  BACKTEST_CHART_START_HOUR,
  BACKTEST_FORECAST_MODEL_BLENDED,
  buildWeekBacktest,
  listForecastModelsFromPoints,
  summarizeWeekBacktest,
} from "../../../lib/forecast-experiment/backtest.js";
import { DEFAULT_BAY_WIND_COEFFICIENTS } from "../../../lib/forecast-experiment/bayWindCoefficients.js";
import { formatForecastModelLabel } from "../../../lib/forecast-experiment/modelLabels.js";
import {
  PREDICTION_MODEL_V1,
  PREDICTION_MODEL_V2,
  PREDICTION_MODEL_V3,
  PREDICTION_MODEL_V4,
  resolvePredictionBacktestConfig,
} from "../../../lib/forecast-experiment/predictionBacktestConfig.js";
import {
  DEFAULT_RIDEABILITY_PRESET,
  RIDEABILITY_THRESHOLD_PRESETS,
} from "../../../lib/forecast-experiment/rideabilityThresholds.js";
import { DayWindChart } from "./DayWindChart.js";
import {
  formatLisbonDateTime,
  isoWeekDateRange,
  localDayWindowMs,
} from "../../../lib/forecast-experiment/time.js";

const DEFAULT_YEAR = 2025;
const DEFAULT_WEEK = 28;
const DEFAULT_SEASON = "2025";
const TIMELINE_START_HOUR = BACKTEST_CHART_START_HOUR;
const TIMELINE_END_HOUR = BACKTEST_CHART_END_HOUR;
const FX_BACKTEST_MODEL_KEY = "fx-backtest-model";
const FX_BACKTEST_PREDICTION_MODEL_KEY = "fx-backtest-prediction-model";
const FX_BACKTEST_PRESET_KEY = "fx-backtest-preset";

function readStoredForecastModel() {
  if (typeof window === "undefined") return BACKTEST_FORECAST_MODEL_BLENDED;
  const stored = localStorage.getItem(FX_BACKTEST_MODEL_KEY);
  return stored || BACKTEST_FORECAST_MODEL_BLENDED;
}

function readStoredPredictionModel() {
  if (typeof window === "undefined") return PREDICTION_MODEL_V1;
  const stored = localStorage.getItem(FX_BACKTEST_PREDICTION_MODEL_KEY);
  if (stored === PREDICTION_MODEL_V4) return PREDICTION_MODEL_V4;
  if (stored === PREDICTION_MODEL_V3) return PREDICTION_MODEL_V3;
  if (stored === PREDICTION_MODEL_V2) return PREDICTION_MODEL_V2;
  return PREDICTION_MODEL_V1;
}

function readStoredPreset() {
  if (typeof window === "undefined") return DEFAULT_RIDEABILITY_PRESET;
  const stored = localStorage.getItem(FX_BACKTEST_PRESET_KEY);
  return stored && RIDEABILITY_THRESHOLD_PRESETS[stored] ? stored : DEFAULT_RIDEABILITY_PRESET;
}

function formatSignedMinutes(minutes) {
  if (minutes == null) return "—";
  const sign = minutes > 0 ? "+" : "";
  return `${sign}${minutes} min`;
}

function formatDayLabel(dateLocal) {
  const { startAt } = localDayWindowMs(dateLocal);
  return formatLisbonDateTime(startAt + 12 * 3_600_000, { includeWeekday: true, includeTime: false });
}

function timelinePosition(ms, dateLocal) {
  if (ms == null) return null;
  const { startAt } = localDayWindowMs(dateLocal);
  const windowStart = startAt + TIMELINE_START_HOUR * 3_600_000;
  const windowEnd = startAt + TIMELINE_END_HOUR * 3_600_000;
  if (ms < windowStart || ms > windowEnd) return null;
  return ((ms - windowStart) / (windowEnd - windowStart)) * 100;
}

function DayTimeline({ day }) {
  const actualPos = timelinePosition(day.actual.kickInAt, day.dateLocal);
  const predictedPos = timelinePosition(day.predicted?.predictedKickInAt, day.dateLocal);

  return (
    <div className="relative mt-2 h-8 rounded bg-ink/5">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink/15" />
      <span className="absolute left-0 top-full pt-1 text-[10px] text-ink/40">{TIMELINE_START_HOUR}:00</span>
      <span className="absolute right-0 top-full pt-1 text-[10px] text-ink/40">{TIMELINE_END_HOUR}:00</span>
      {actualPos != null && (
        <span
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600"
          style={{ left: `${actualPos}%` }}
          title={`Actual: ${formatLisbonDateTime(day.actual.kickInAt)}`}
        />
      )}
      {predictedPos != null && (
        <span
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-600 bg-white"
          style={{ left: `${predictedPos}%` }}
          title={`Predicted kick-in: ${formatLisbonDateTime(day.predicted.predictedKickInAt)}`}
        />
      )}
    </div>
  );
}

export default function ExperimentBacktestPage() {
  const searchParams = useSearchParams();
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [week, setWeek] = useState(DEFAULT_WEEK);
  const [forecastModel, setForecastModel] = useState(BACKTEST_FORECAST_MODEL_BLENDED);
  const [predictionModel, setPredictionModel] = useState(() => {
    const modelParam = searchParams.get("model");
    if (modelParam === PREDICTION_MODEL_V4) return PREDICTION_MODEL_V4;
    if (modelParam === PREDICTION_MODEL_V3) return PREDICTION_MODEL_V3;
    if (modelParam === PREDICTION_MODEL_V2) return PREDICTION_MODEL_V2;
    if (modelParam === PREDICTION_MODEL_V1) return PREDICTION_MODEL_V1;
    return readStoredPredictionModel();
  });
  const [thresholdPreset, setThresholdPreset] = useState(() => {
    const presetParam = searchParams.get("preset");
    if (presetParam && RIDEABILITY_THRESHOLD_PRESETS[presetParam]) return presetParam;
    return readStoredPreset();
  });
  const [seasonId, setSeasonId] = useState(() => searchParams.get("season") ?? DEFAULT_SEASON);
  const [seasonBacktest, setSeasonBacktest] = useState(null);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [seasonError, setSeasonError] = useState(null);

  useEffect(() => {
    setForecastModel(readStoredForecastModel());
  }, []);

  useEffect(() => {
    const modelParam = searchParams.get("model");
    if (modelParam === PREDICTION_MODEL_V4) setPredictionModel(PREDICTION_MODEL_V4);
    else if (modelParam === PREDICTION_MODEL_V3) setPredictionModel(PREDICTION_MODEL_V3);
    else if (modelParam === PREDICTION_MODEL_V2) setPredictionModel(PREDICTION_MODEL_V2);
    else if (modelParam === PREDICTION_MODEL_V1) setPredictionModel(PREDICTION_MODEL_V1);

    const presetParam = searchParams.get("preset");
    if (presetParam && RIDEABILITY_THRESHOLD_PRESETS[presetParam]) {
      setThresholdPreset(presetParam);
    }

    const seasonParam = searchParams.get("season");
    if (seasonParam) setSeasonId(seasonParam);
  }, [searchParams]);

  useEffect(() => {
    localStorage.setItem(FX_BACKTEST_MODEL_KEY, forecastModel);
  }, [forecastModel]);

  useEffect(() => {
    localStorage.setItem(FX_BACKTEST_PREDICTION_MODEL_KEY, predictionModel);
  }, [predictionModel]);

  useEffect(() => {
    localStorage.setItem(FX_BACKTEST_PRESET_KEY, thresholdPreset);
  }, [thresholdPreset]);

  useEffect(() => {
    let cancelled = false;
    async function loadSeasonBacktest() {
      setSeasonLoading(true);
      setSeasonError(null);
      try {
        const params = new URLSearchParams({
          season: seasonId,
          model: predictionModel,
          preset: thresholdPreset,
        });
        const response = await fetch(`/api/experiment/prediction-backtest?${params.toString()}`);
        const payload = await response.json();
        if (cancelled) return;
        if (!response.ok || !payload.ok) {
          setSeasonBacktest(null);
          setSeasonError(payload.error ?? "Season backtest failed");
          return;
        }
        setSeasonBacktest(payload);
      } catch (error) {
        if (cancelled) return;
        setSeasonBacktest(null);
        setSeasonError(error instanceof Error ? error.message : "Season backtest failed");
      } finally {
        if (!cancelled) setSeasonLoading(false);
      }
    }

    loadSeasonBacktest();
    return () => {
      cancelled = true;
    };
  }, [seasonId, predictionModel, thresholdPreset]);

  const weekRange = useMemo(() => {
    try {
      return isoWeekDateRange(year, week);
    } catch {
      return null;
    }
  }, [year, week]);

  const predictionConfig = useMemo(
    () =>
      resolvePredictionBacktestConfig(predictionModel, {
        coefficients: DEFAULT_BAY_WIND_COEFFICIENTS,
      }),
    [predictionModel]
  );

  const windows = useMemo(() => {
    if (!weekRange) return null;
    const { startAt: weekStart } = localDayWindowMs(weekRange.startDateLocal);
    const { endAt: weekEnd } = localDayWindowMs(weekRange.endDateLocal);
    return {
      obsStartAt: weekStart - 2 * 3_600_000,
      obsEndAt: weekEnd + 2 * 3_600_000,
      forecastStartAt: weekStart + TIMELINE_START_HOUR * 3_600_000,
      forecastEndAt: weekEnd + TIMELINE_END_HOUR * 3_600_000,
    };
  }, [weekRange]);

  const marinaObs = useQuery(
    api.forecastExperiment.listObservationsForWindow,
    windows
      ? {
          locationSlug: "cascais-bay",
          startAt: windows.obsStartAt,
          endAt: windows.obsEndAt,
        }
      : "skip"
  );
  const caboObs = useQuery(
    api.forecastExperiment.listObservationsForWindow,
    windows
      ? {
          locationSlug: "cabo-raso",
          startAt: windows.obsStartAt,
          endAt: windows.obsEndAt,
        }
      : "skip"
  );
  const forecastPoints = useQuery(
    api.forecastExperiment.listForecastPointsForWindow,
    windows
      ? {
          locationSlug: "cascais-bay",
          startAt: windows.forecastStartAt,
          endAt: windows.forecastEndAt,
        }
      : "skip"
  );

  const loading = weekRange && (marinaObs === undefined || caboObs === undefined || forecastPoints === undefined);

  const forecastModelOptions = useMemo(() => {
    if (!forecastPoints) {
      return [{ value: BACKTEST_FORECAST_MODEL_BLENDED, label: "Blended" }];
    }
    const models = listForecastModelsFromPoints(forecastPoints);
    return [
      { value: BACKTEST_FORECAST_MODEL_BLENDED, label: "Blended" },
      ...models.map((model) => ({
        value: model,
        label: formatForecastModelLabel(model),
      })),
    ];
  }, [forecastPoints]);

  useEffect(() => {
    if (
      predictionModel === PREDICTION_MODEL_V2 ||
      predictionModel === PREDICTION_MODEL_V3 ||
      predictionModel === PREDICTION_MODEL_V4
    )
      return;
    if (forecastModel === BACKTEST_FORECAST_MODEL_BLENDED) return;
    const isAvailable = forecastModelOptions.some((option) => option.value === forecastModel);
    if (!isAvailable) setForecastModel(BACKTEST_FORECAST_MODEL_BLENDED);
  }, [forecastModel, forecastModelOptions, predictionModel]);

  const effectiveForecastModel =
    predictionModel === PREDICTION_MODEL_V2 ||
    predictionModel === PREDICTION_MODEL_V3 ||
    predictionModel === PREDICTION_MODEL_V4
      ? predictionConfig.forecastModel
      : forecastModel;

  const backtest = useMemo(() => {
    if (!weekRange || !marinaObs || !caboObs || !forecastPoints) return null;
    const days = buildWeekBacktest({
      datesLocal: weekRange.dates,
      marinaObservations: marinaObs,
      caboRasoObservations: caboObs,
      forecastPoints,
      forecastModel: effectiveForecastModel,
      buildPrediction: predictionConfig.buildPrediction,
      predictionOptions: predictionConfig.predictionOptions,
      preset: thresholdPreset,
    });
    return {
      days,
      summary: summarizeWeekBacktest(days),
    };
  }, [
    weekRange,
    marinaObs,
    caboObs,
    forecastPoints,
    effectiveForecastModel,
    predictionConfig,
    thresholdPreset,
  ]);

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-ink/15 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold">Historical week backtest</h2>
        <p className="mt-1 text-sm text-ink/70">
          Compare model kick-in predictions against actual CNC Foil station readings (Windguru 2329).
          Predictions simulate what the selected model would have said by 07:00 Lisbon each morning.
        </p>
        <p className="mt-2 text-xs text-ink/50">
          <strong>Forecast layer</strong> (day-ahead / multi-day planning): v3.5 ML with conservative thresholds (NWP-driven, low false positives). 
          <strong>Nowcast layer</strong> (same-day refining): uses live Cabo observations for tighter windows. 
          v3.5 (default) is the pragmatic Forecast engine; other models can illustrate Nowcast when Cabo data is present.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="mb-1 block text-ink/60">Year</span>
            <input
              type="number"
              min={2020}
              max={2026}
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="w-24 rounded-md border border-ink/20 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink/60">ISO week</span>
            <input
              type="number"
              min={1}
              max={53}
              value={week}
              onChange={(event) => setWeek(Number(event.target.value))}
              className="w-24 rounded-md border border-ink/20 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink/60">Prediction model</span>
            <select
              value={predictionModel}
              onChange={(event) => setPredictionModel(event.target.value)}
              className="min-w-[10rem] rounded-md border border-ink/20 px-3 py-2"
            >
              <option value={PREDICTION_MODEL_V1}>v1 baseline ensemble</option>
              <option value={PREDICTION_MODEL_V2}>v2 bay-wind</option>
              <option value={PREDICTION_MODEL_V3}>v3 bay-wind ML</option>
              <option value={PREDICTION_MODEL_V4}>v4 bay-wind ensemble</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink/60">Rideability preset</span>
            <select
              value={thresholdPreset}
              onChange={(event) => setThresholdPreset(event.target.value)}
              className="min-w-[10rem] rounded-md border border-ink/20 px-3 py-2"
            >
              {Object.entries(RIDEABILITY_THRESHOLD_PRESETS).map(([slug, knots]) => (
                <option key={slug} value={slug}>
                  {slug} ({knots} kt)
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink/60">Season summary</span>
            <select
              value={seasonId}
              onChange={(event) => setSeasonId(event.target.value)}
              className="min-w-[10rem] rounded-md border border-ink/20 px-3 py-2"
            >
              <option value="2024">Summer 2024</option>
              <option value="2025">Summer 2025</option>
              <option value="2026">Summer 2026</option>
              <option value="average">Average (2024–2025)</option>
            </select>
          </label>
          {predictionModel === PREDICTION_MODEL_V1 && (
            <label className="text-sm">
              <span className="mb-1 block text-ink/60">Forecast model</span>
              <select
                value={forecastModel}
                onChange={(event) => setForecastModel(event.target.value)}
                className="min-w-[12rem] rounded-md border border-ink/20 px-3 py-2"
              >
                {forecastModelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {weekRange && (
          <p className="mt-3 text-sm text-ink/70">
            {formatDayLabel(weekRange.startDateLocal)} – {formatDayLabel(weekRange.endDateLocal)}
          </p>
        )}

        <p className="mt-3 text-xs text-ink/50">
          Marina obs backfill from mid-2020. Ensemble forecast backfill currently covers May–September 2025.
          v2 uses ICON EU day-1 only; v1 uses blended ensemble by default.
        </p>
      </section>

      <section className="rounded-lg border border-ink/15 bg-white p-5 shadow-sm">
        {seasonBacktest && seasonBacktest.hasMarinaLabels === false && (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            <div className="font-semibold text-amber-400">No marina observations for this season</div>
            <div className="mt-1 text-amber-300/90">
              Windguru 2329 (Cascais Bay / Marina) has been offline since ~April 2026. Backtest metrics and "Average" comparisons for 2026 use weaker Cabo-lag or report-assisted labels.
            </div>
            <div className="mt-2 text-amber-300/80">
              <strong>Forecast layer</strong> (day-ahead / multi-day) validation is limited. <strong>Nowcast</strong> (same-day) can still be developed and scored using live station data + user reports.
            </div>
          </div>
        )}

        <h3 className="text-sm font-semibold">Season summary ({seasonBacktest?.seasonLabel ?? seasonId})</h3>
        <p className="mt-1 text-xs text-ink/50">
          Server-side backtest via API · model {predictionModel} · {thresholdPreset} (
          {RIDEABILITY_THRESHOLD_PRESETS[thresholdPreset]} kt)
        </p>
        {seasonLoading && <p className="mt-3 text-sm text-ink/60">Loading season backtest…</p>}
        {seasonError && <p className="mt-3 text-sm text-red-700">{seasonError}</p>}
        {seasonBacktest?.summary && (
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-ink/60">Days comparable</dt>
              <dd className="font-semibold tabular-nums">{seasonBacktest.summary.daysComparable}</dd>
            </div>
            <div>
              <dt className="text-ink/60">Mean abs. error (kick-in)</dt>
              <dd className="font-semibold tabular-nums">
                {seasonBacktest.summary.meanAbsoluteErrorMinutes != null
                  ? `${seasonBacktest.summary.meanAbsoluteErrorMinutes} min`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-ink/60">Within ±1 hour</dt>
              <dd className="font-semibold tabular-nums">
                {seasonBacktest.summary.daysComparable > 0
                  ? `${seasonBacktest.summary.withinHourCount}/${seasonBacktest.summary.daysComparable}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-ink/60">False + / −</dt>
              <dd className="font-semibold tabular-nums">
                {seasonBacktest.summary.falsePositiveCount}/{seasonBacktest.summary.falseNegativeCount}
              </dd>
            </div>
          </dl>
        )}
      </section>

      {loading && <p className="text-sm text-ink/60">Loading week data…</p>}

      {backtest && (
        <>
          <section className="rounded-lg border border-ink/15 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold">Week summary</h3>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-ink/60">Days with bay kick-in (2329)</dt>
                <dd className="font-semibold tabular-nums">{backtest.summary.daysWithActualKickIn}</dd>
              </div>
              <div>
                <dt className="text-ink/60">Days with model prediction</dt>
                <dd className="font-semibold tabular-nums">{backtest.summary.daysWithPrediction}</dd>
              </div>
              <div>
                <dt className="text-ink/60">Mean abs. error (kick-in)</dt>
                <dd className="font-semibold tabular-nums">
                  {backtest.summary.meanAbsoluteErrorMinutes != null
                    ? `${backtest.summary.meanAbsoluteErrorMinutes} min`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-ink/60">Within ±1 hour</dt>
                <dd className="font-semibold tabular-nums">
                  {backtest.summary.daysComparable > 0
                    ? `${backtest.summary.withinHourCount}/${backtest.summary.daysComparable}`
                    : "—"}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-ink/50">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-600 align-middle" /> Actual kick-in
              {" · "}
              <span className="inline-block h-2 w-2 rounded-full border-2 border-sky-600 align-middle" /> Predicted kick-in
            </p>
          </section>

          <section className="space-y-4">
            {backtest.days.map((day) => (
              <article key={day.dateLocal} className="rounded-lg border border-ink/15 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{formatDayLabel(day.dateLocal)}</h3>
                    <p className="mt-1 text-xs text-ink/50">{day.dateLocal}</p>
                  </div>
                  <p className="text-sm tabular-nums text-ink/70">
                    Error: {formatSignedMinutes(day.errorMinutes)}
                  </p>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-md bg-emerald-50 p-3 text-sm">
                    <p className="font-medium text-emerald-900">Actual (CNC Foil 2329)</p>
                    <p className="mt-1 tabular-nums">
                      {day.actual.kickInAt
                        ? formatLisbonDateTime(day.actual.kickInAt)
                        : day.actual.labelStatus === "no-kick"
                          ? "No sustained kick-in"
                          : "Insufficient station data"}
                    </p>
                    <p className="mt-1 text-xs text-emerald-900/70">
                      {day.actual.observationCount} readings
                      {day.actual.maxWindKnots != null ? ` · peak ${day.actual.maxWindKnots} kt` : ""}
                    </p>
                  </div>

                  <div className="rounded-md bg-sky-50 p-3 text-sm">
                    <p className="font-medium text-sky-900">Model kick-in</p>
                    <p className="mt-1 tabular-nums">
                      {day.predicted?.predictedKickInAt
                        ? formatLisbonDateTime(day.predicted.predictedKickInAt)
                        : day.hasForecastData
                          ? "No rideable window predicted"
                          : "No forecast data for this day"}
                    </p>
                    {day.predicted && (
                      <p className="mt-1 text-xs text-sky-900/70">
                        Confidence {Math.round(day.predicted.confidence * 100)}%
                        {day.predicted.predictedStrongKickInAt
                          ? ` · Strong ${formatLisbonDateTime(day.predicted.predictedStrongKickInAt)}`
                          : ""}
                      </p>
                    )}
                  </div>
                </div>

                <DayTimeline day={day} />
                {day.chart && <DayWindChart chart={day.chart} />}
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
