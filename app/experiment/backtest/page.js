"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  BACKTEST_CHART_END_HOUR,
  BACKTEST_CHART_START_HOUR,
  BACKTEST_FORECAST_MODEL_BLENDED,
  buildWeekBacktest,
  listForecastModelsFromPoints,
  summarizeWeekBacktest,
} from "../../../lib/forecast-experiment/backtest.js";
import { formatForecastModelLabel } from "../../../lib/forecast-experiment/modelLabels.js";
import { DayWindChart } from "./DayWindChart.js";
import {
  formatLisbonDateTime,
  isoWeekDateRange,
  localDayWindowMs,
} from "../../../lib/forecast-experiment/time.js";

const DEFAULT_YEAR = 2025;
const DEFAULT_WEEK = 28;
const TIMELINE_START_HOUR = BACKTEST_CHART_START_HOUR;
const TIMELINE_END_HOUR = BACKTEST_CHART_END_HOUR;
const FX_BACKTEST_MODEL_KEY = "fx-backtest-model";

function readStoredForecastModel() {
  if (typeof window === "undefined") return BACKTEST_FORECAST_MODEL_BLENDED;
  const stored = localStorage.getItem(FX_BACKTEST_MODEL_KEY);
  return stored || BACKTEST_FORECAST_MODEL_BLENDED;
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
  const predictedPos = timelinePosition(day.predicted?.kickInP50At, day.dateLocal);

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
          title={`Predicted P50: ${formatLisbonDateTime(day.predicted.kickInP50At)}`}
        />
      )}
    </div>
  );
}

export default function ExperimentBacktestPage() {
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [week, setWeek] = useState(DEFAULT_WEEK);
  const [forecastModel, setForecastModel] = useState(BACKTEST_FORECAST_MODEL_BLENDED);

  useEffect(() => {
    setForecastModel(readStoredForecastModel());
  }, []);

  useEffect(() => {
    localStorage.setItem(FX_BACKTEST_MODEL_KEY, forecastModel);
  }, [forecastModel]);

  const weekRange = useMemo(() => {
    try {
      return isoWeekDateRange(year, week);
    } catch {
      return null;
    }
  }, [year, week]);

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
    if (forecastModel === BACKTEST_FORECAST_MODEL_BLENDED) return;
    const isAvailable = forecastModelOptions.some((option) => option.value === forecastModel);
    if (!isAvailable) setForecastModel(BACKTEST_FORECAST_MODEL_BLENDED);
  }, [forecastModel, forecastModelOptions]);

  const backtest = useMemo(() => {
    if (!weekRange || !marinaObs || !caboObs || !forecastPoints) return null;
    const days = buildWeekBacktest({
      datesLocal: weekRange.dates,
      marinaObservations: marinaObs,
      caboRasoObservations: caboObs,
      forecastPoints,
      forecastModel,
    });
    return {
      days,
      summary: summarizeWeekBacktest(days),
    };
  }, [weekRange, marinaObs, caboObs, forecastPoints, forecastModel]);

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-ink/15 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold">Historical week backtest</h2>
        <p className="mt-1 text-sm text-ink/70">
          Compare model kick-in predictions against actual CNC Foil station readings (Windguru 2329).
          Predictions simulate what the baseline model would have said by 07:00 Lisbon each morning.
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
        </div>

        {weekRange && (
          <p className="mt-3 text-sm text-ink/70">
            {formatDayLabel(weekRange.startDateLocal)} – {formatDayLabel(weekRange.endDateLocal)}
          </p>
        )}

        <p className="mt-3 text-xs text-ink/50">
          Marina obs backfill from mid-2020. Ensemble forecast backfill currently covers May–September 2025.
        </p>
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
                <dt className="text-ink/60">Mean abs. error (P50)</dt>
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
              <span className="inline-block h-2 w-2 rounded-full border-2 border-sky-600 align-middle" /> Predicted P50
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
                    <p className="font-medium text-sky-900">Model P50 kick-in</p>
                    <p className="mt-1 tabular-nums">
                      {day.predicted?.kickInP50At
                        ? formatLisbonDateTime(day.predicted.kickInP50At)
                        : day.hasForecastData
                          ? "No rideable window predicted"
                          : "No forecast data for this day"}
                    </p>
                    {day.predicted && (
                      <p className="mt-1 text-xs text-sky-900/70">
                        Confidence {Math.round(day.predicted.confidence * 100)}%
                        {day.predicted.kickInP75At
                          ? ` · P75 ${formatLisbonDateTime(day.predicted.kickInP75At)}`
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
