"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { BayDayWindChart } from "./BayDayWindChart.js";
import { experimentDisplayForecastWindyLabel } from "../../lib/forecast-experiment/modelLabels.js";
import {
  REPORT_OPTIONS,
  describeCaboLine,
  formatRelativeMinutes,
  verdictBg,
  verdictDot,
} from "../../lib/forecast-experiment/userFacingCopy.js";

export function BayForecastDashboard({ dashboard }) {
  const [outlook, setOutlook] = useState(null);
  const [todayOutlook, setTodayOutlook] = useState(null);
  const [todayOutlookLoading, setTodayOutlookLoading] = useState(true);
  const [todayChart, setTodayChart] = useState(null);
  const [todayChartLoading, setTodayChartLoading] = useState(true);
  const [selectedForecastDate, setSelectedForecastDate] = useState(null);
  const [forecastChart, setForecastChart] = useState(null);
  const [forecastChartLoading, setForecastChartLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [caboFlatNote, setCaboFlatNote] = useState(false);
  const saveReport = useMutation(api.forecastExperiment.saveUserReport);

  const bootstrapTodayKey =
    dashboard.latestNowcastPrediction?.forecastDateLocal ??
    dashboard.latestBayPrediction?.forecastDateLocal;
  const todayDisplay = todayOutlook?.today;
  const todayKey = todayDisplay?.dateLocal ?? bootstrapTodayKey;

  useEffect(() => {
    let cancelled = false;
    setTodayOutlookLoading(true);
    fetch("/api/experiment/today-outlook")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.ok) setTodayOutlook(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setTodayOutlookLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetch("/api/experiment/week-outlook")
      .then((r) => r.json())
      .then((data) => data.ok && setOutlook(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!todayKey) return;
    let cancelled = false;
    setTodayChartLoading(true);
    fetch(`/api/experiment/day-chart?date=${todayKey}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.ok) setTodayChart(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setTodayChartLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [todayKey]);

  useEffect(() => {
    if (!selectedForecastDate || selectedForecastDate === todayKey) {
      setForecastChart(null);
      setForecastChartLoading(false);
      return;
    }
    let cancelled = false;
    setForecastChartLoading(true);
    fetch(`/api/experiment/day-chart?date=${selectedForecastDate}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.ok) setForecastChart(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setForecastChartLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedForecastDate, todayKey]);

  const caboLine = describeCaboLine(
    todayOutlook?.latestCaboRaso ?? dashboard.latestCaboRaso
  );
  const updatedAt = todayOutlook?.generatedAt ?? dashboard.latestNowcastPrediction?.generatedAt;
  const forecastLabel = todayChart?.forecastModelLabel ?? experimentDisplayForecastWindyLabel();

  const week = useMemo(() => {
    if (!outlook?.days?.length) return [];
    return outlook.days.filter((day) => day.dateLocal !== todayKey);
  }, [outlook, todayKey]);

  function handleDayClick(dateLocal) {
    if (dateLocal === todayKey) {
      setSelectedForecastDate(null);
      return;
    }
    const day = outlook?.days?.find((entry) => entry.dateLocal === dateLocal);
    if (!day?.hasChartForecast) return;
    setSelectedForecastDate((prev) => (prev === dateLocal ? null : dateLocal));
  }

  async function submit(status) {
    setSubmitting(true);
    setMessage("");
    try {
      await saveReport({
        userId: null,
        locationSlug: "cascais-bay",
        sport: "wingfoil",
        observedAt: Date.now(),
        status,
        notes: caboFlatNote ? "Cabo Raso windy, bay still flat." : undefined,
        confidence: 0.6,
      });
      setMessage("Thanks!");
      setCaboFlatNote(false);
    } catch (error) {
      setMessage(error.message || "Could not save.");
    } finally {
      setSubmitting(false);
    }
  }

  const meta = [caboLine, updatedAt && formatRelativeMinutes(updatedAt)].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      <section className={`rounded-xl p-5 ring-1 ${verdictBg(todayDisplay?.verdict ?? "skip")}`}>
        <p className="text-xs text-ink/45">Today</p>
        {todayOutlookLoading && !todayDisplay && (
          <p className="mt-3 text-sm text-ink/40">Loading today&apos;s outlook…</p>
        )}
        {todayDisplay && (
          <>
            <p className="mt-1 text-2xl font-semibold text-ink">{todayDisplay.headline}</p>
            {todayDisplay.kickInTimePlain && (
              <p className="mt-1 text-sm font-medium text-ink/70">
                {todayDisplay.likelihoodPct != null ? `${todayDisplay.likelihoodPct}% · ` : ""}
                Wind from ~{todayDisplay.kickInTimePlain}
              </p>
            )}
          </>
        )}
        {meta && <p className="mt-2 text-sm text-ink/45">{meta}</p>}
        <div className="mt-4 border-t border-ink/10 pt-4">
          <p className="text-xs text-ink/45">{forecastLabel} marina forecast + Cabo Raso</p>
          {todayChartLoading && <p className="mt-3 text-xs text-ink/40">Loading chart…</p>}
          {!todayChartLoading && todayChart?.hasForecast && (
            <BayDayWindChart
              chart={todayChart}
              showCabo
              kickInAtMs={todayDisplay?.kickInAtMs}
            />
          )}
          {!todayChartLoading && !todayChart?.hasForecast && (
            <p className="mt-3 text-xs text-ink/40">No forecast data yet.</p>
          )}
        </div>
      </section>

      {week.length > 0 && (
        <section className="rounded-xl bg-white ring-1 ring-ink/10">
          <p className="border-b border-ink/8 px-5 py-3 text-xs text-ink/45">Upcoming days</p>
          <ul className="divide-y divide-ink/8">
            {week.map((day) => {
              const isToday = day.dateLocal === todayKey;
              const expanded = selectedForecastDate === day.dateLocal;
              return (
                <li key={day.dateLocal}>
                  <button
                    type="button"
                    onClick={() => handleDayClick(day.dateLocal)}
                    className={`flex w-full items-center gap-3 px-5 py-3 text-left text-sm transition-colors ${
                      expanded ? "bg-ink/[0.04]" : "hover:bg-ink/[0.02]"
                    }`}
                  >
                    <span className="w-16 shrink-0 text-ink/70">{day.dayLabel}</span>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${verdictDot(day.verdict)}`} />
                    <span className="flex-1 text-ink">{day.headline}</span>
                    <span className="tabular-nums text-ink/45">{day.kickInTime ?? "—"}</span>
                  </button>
                  {expanded && !isToday && (
                    <div className="border-t border-ink/8 bg-ink/[0.02] px-5 pb-4">
                      <p className="pt-3 text-xs text-ink/45">
                        {day.dayLabel} · {(forecastChart?.forecastModelLabel ?? forecastLabel)} marina forecast
                      </p>
                      {forecastChartLoading && (
                        <p className="mt-3 text-xs text-ink/40">Loading chart…</p>
                      )}
                      {!forecastChartLoading && forecastChart?.hasForecast && (
                        <BayDayWindChart
                          chart={forecastChart}
                          showCabo={false}
                          kickInAtMs={day.kickInAtMs}
                        />
                      )}
                      {!forecastChartLoading && !forecastChart?.hasForecast && (
                        <p className="mt-3 text-xs text-ink/40">No forecast data yet.</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="rounded-xl bg-white p-5 ring-1 ring-ink/10">
        <p className="text-sm font-medium text-ink">How&apos;s the bay?</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {REPORT_OPTIONS.map((option) => (
            <button
              key={option.status}
              type="button"
              disabled={submitting}
              onClick={() => submit(option.status)}
              className="rounded-lg border border-ink/10 py-2.5 text-sm font-medium text-ink hover:bg-ink/5 disabled:opacity-50"
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-ink/50">
          <input
            type="checkbox"
            checked={caboFlatNote}
            onChange={(e) => setCaboFlatNote(e.target.checked)}
          />
          Cabo windy, bay still flat
        </label>
        {message && <p className="mt-2 text-xs text-ink/50">{message}</p>}
      </section>
    </div>
  );
}
