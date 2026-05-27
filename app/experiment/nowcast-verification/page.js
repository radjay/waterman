"use client";

import { useEffect, useState } from "react";
import { listAnalysisSeasonOptions } from "../../../lib/forecast-experiment/analysisSeasons.js";
import { DEFAULT_RIDEABILITY_PRESET } from "../../../lib/forecast-experiment/rideabilityThresholds.js";

const MARINA_SEASONS = listAnalysisSeasonOptions().filter((option) => option.hasMarinaLabels && option.id !== "average");

export default function NowcastVerificationPage() {
  const [seasonId, setSeasonId] = useState("2025");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/experiment/nowcast-uplift?season=${encodeURIComponent(seasonId)}&preset=${DEFAULT_RIDEABILITY_PRESET}`
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Backtest failed");
        }
        if (!cancelled) setResult(payload);
      } catch (err) {
        if (!cancelled) {
          setResult(null);
          setError(err.message || "Could not load nowcast uplift backtest");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [seasonId]);

  const summary = result?.summary;

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-ink/15 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold">Phase 5 — Nowcast verification</h2>
        <p className="mt-2 text-sm text-ink/70">
          Historical uplift: compare conservative day-ahead Forecast (07:00) vs same-day Nowcast (11:00)
          on marina-validated rideable days when Cabo Raso was already strong before noon.
        </p>
        <p className="mt-2 text-sm text-ink/60">
          Live loop: run{" "}
          <code className="rounded bg-ink/5 px-1">npm run fx:verify:nowcast-loop</code> with observation
          polling active.
        </p>

        <div className="mt-4">
          <label className="text-sm font-medium">
            Season
            <select
              className="ml-2 rounded border border-ink/20 px-2 py-1 text-sm"
              value={seasonId}
              onChange={(event) => setSeasonId(event.target.value)}
            >
              {MARINA_SEASONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {loading && <p className="text-sm text-ink/60">Running uplift backtest (first load ~30–60s)…</p>}
      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>
      )}

      {summary && (
        <>
          <section
            className={`rounded-lg border p-5 shadow-sm ${
              summary.passesVerification
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <h3 className="text-base font-semibold">
              {summary.passesVerification ? "Pass" : "Needs work"} — uplift summary
            </h3>
            <p className="mt-2 text-sm">
              Qualifying days: {summary.qualifyingDayCount} · Comparable: {summary.comparableDayCount} ·
              Improved: {summary.improvedCount}
              {summary.improvedShare != null ? ` (${Math.round(summary.improvedShare * 100)}%)` : ""}
            </p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-ink/60">Forecast MAE</dt>
                <dd className="font-semibold tabular-nums">{summary.meanForecastErrorMinutes ?? "—"} min</dd>
              </div>
              <div>
                <dt className="text-ink/60">Nowcast MAE</dt>
                <dd className="font-semibold tabular-nums">{summary.meanNowcastErrorMinutes ?? "—"} min</dd>
              </div>
              <div>
                <dt className="text-ink/60">Mean uplift</dt>
                <dd className="font-semibold tabular-nums">{summary.meanUpliftMinutes ?? "—"} min</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-ink/60">
              Acceptance: mean uplift ≥ {summary.acceptance.minMeanUpliftMinutes} min and ≥
              {Math.round(summary.acceptance.minImprovedShare * 100)}% of comparable days improved (≥5 days).
            </p>
          </section>

          {result.days?.length > 0 && (
            <section className="rounded-lg border border-ink/15 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold">Qualifying days</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink/10 text-ink/60">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Forecast err</th>
                      <th className="py-2 pr-4">Nowcast err</th>
                      <th className="py-2 pr-4">Uplift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.days.map((day) => (
                      <tr key={day.dateLocal} className="border-b border-ink/5">
                        <td className="py-2 pr-4 tabular-nums">{day.dateLocal}</td>
                        <td className="py-2 pr-4 tabular-nums">{day.forecastErrorMinutes ?? "—"}</td>
                        <td className="py-2 pr-4 tabular-nums">{day.nowcastErrorMinutes ?? "—"}</td>
                        <td
                          className={`py-2 pr-4 tabular-nums ${
                            day.upliftMinutes > 0 ? "text-emerald-700" : ""
                          }`}
                        >
                          {day.upliftMinutes ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
