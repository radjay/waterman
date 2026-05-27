"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDisplayWindDirection } from "../../lib/utils.js";
import { effectiveWindKnots } from "../../lib/forecast-experiment/units.js";

const REPORT_OPTIONS = [
  { status: "not_in", label: "Not yet" },
  { status: "marginal", label: "Marginal" },
  { status: "rideable", label: "Rideable" },
  { status: "strong", label: "Strong" },
];

export default function ExperimentPage() {
  const dashboard = useQuery(api.forecastExperiment.experimentDashboard);
  const [locationSlug, setLocationSlug] = useState("cascais-bay");
  const [caboFlatNote, setCaboFlatNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const saveReport = useMutation(api.forecastExperiment.saveUserReport);

  const cabo = dashboard?.latestCaboRaso;
  const prediction =
    dashboard?.latestBayPrediction ??
    dashboard?.latestPredictions?.find((row) => row.targetLocationSlug === "cascais-bay");
  const caboEffective = cabo ? effectiveWindKnots(cabo) : undefined;

  const caboDirection = useMemo(() => {
    if (!cabo?.windDirectionDeg && cabo?.windDirectionDeg !== 0) return null;
    return getDisplayWindDirection(cabo.windDirectionDeg);
  }, [cabo]);

  async function handleReport(status) {
    setSubmitting(true);
    setMessage("");
    try {
      await saveReport({
        userId: null,
        locationSlug,
        sport: "wingfoil",
        observedAt: Date.now(),
        status,
        notes: caboFlatNote ? "Cabo Raso windy, bay still flat." : undefined,
        confidence: 0.6,
      });
      setMessage("Report saved. Thanks!");
      setCaboFlatNote(false);
    } catch (error) {
      setMessage(error.message || "Could not save report.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!dashboard) {
    return <p className="text-ink/60">Loading experiment dashboard...</p>;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-ink/15 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold">Live Cabo Raso (station 3294)</h2>
        {cabo ? (
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <p>
              Effective wind:{" "}
              <span className="font-semibold tabular-nums">
                {caboEffective ?? "—"} kt
              </span>
              {cabo.windSpeedKnots != null && cabo.windGustKnots != null && (
                <span className="text-ink/60">
                  {" "}
                  ({cabo.windSpeedKnots}/{cabo.windGustKnots} avg/gust)
                </span>
              )}
            </p>
            <p>
              Direction:{" "}
              <span className="font-semibold">
                {caboDirection ?? "—"}
              </span>
            </p>
            <p className="text-ink/60 sm:col-span-2">
              Updated {new Date(cabo.observedAt).toLocaleString("en-GB", { timeZone: "Europe/Lisbon" })}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink/60">No Cabo Raso observations yet. Run the observation worker or backfill.</p>
        )}
      </section>

      <section className="rounded-lg border border-ink/15 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold">Latest bay prediction</h2>
        {prediction ? (
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-ink/60">
              Model{" "}
              <span className="font-medium text-ink">{prediction.modelVersion}</span>
              {prediction.inputs?.mode ? ` · ${prediction.inputs.mode === 'nowcast' ? 'Nowcast (live Cabo)' : 'Forecast (day-ahead, conservative)'}` : ""}
            </p>
            <p>{prediction.summary}</p>
            <p className="text-ink/70">
              Model {prediction.modelVersion}
              {prediction.inputs?.mode ? ` (${prediction.inputs.mode === 'nowcast' ? 'Nowcast (live Cabo)' : 'Forecast (day-ahead, conservative)'})` : ""}
              {" · "}
              Confidence {Math.round(prediction.confidence * 100)}% · threshold {prediction.thresholdKnots} kt effective
            </p>
            {prediction.kickInP50At && (
              <p className="tabular-nums">
                P50 kick-in: {new Date(prediction.kickInP50At).toLocaleString("en-GB", { timeZone: "Europe/Lisbon" })}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink/60">No predictions yet.</p>
        )}
      </section>

      {dashboard.latestBayLabel && (
        <section className="rounded-lg border border-ink/15 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold">Today's label source (cascais-bay)</h2>
          <div className="mt-3 text-sm">
            <span className="font-medium">{dashboard.latestBayLabel.labelStatus}</span>
            {dashboard.latestBayLabel.sourceSummary && (
              <span className="text-ink/70"> — {dashboard.latestBayLabel.sourceSummary}</span>
            )}
          </div>
          <p className="mt-2 text-xs text-ink/50">
            Used for training and backtesting. "observed" = real marina anemometer data (currently unavailable since ~April 2026). 
            <strong>Forecast layer</strong> (day-ahead / multi-day planning): v3.5 ML with conservative thresholds (NWP-driven, low false positives). 
            <strong>Nowcast layer</strong> (same-day refining): uses live Cabo observations for tighter windows as conditions develop. 
            Predictions below show their layer (<code>day-ahead</code> or <code>nowcast</code> via <code>inputs.mode</code>).
          </p>
          <div className="mt-3 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm shadow-sm">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sky-900">Today’s Nowcast — Phase 5 (live refining)</div>
              <div className="rounded bg-sky-200 px-2 py-0.5 text-[10px] font-medium text-sky-800">Continuous</div>
            </div>

            <p className="mt-2 text-sky-800">
              Starts as the conservative day-ahead Forecast in the morning. As fresh Cabo Raso observations arrive, the same v3.5 model (with dynamic Cabo features) produces tighter, higher-confidence windows for <strong>today</strong>. This is the high-accuracy same-day layer.
            </p>

            {cabo ? (
              <div className="mt-3 rounded border border-sky-200 bg-white/60 p-2.5 text-xs">
                <div className="font-medium text-sky-900">Live data driving this layer</div>
                <div className="mt-1 text-sky-700">
                  Cabo Raso: <span className="font-semibold">{new Date(cabo.observedAt).toLocaleString('en-GB', { timeZone: 'Europe/Lisbon' })}</span>
                  <span className="ml-2 text-sky-500">({Math.max(0, Math.round((Date.now() - cabo.observedAt) / 60000))} min ago)</span>
                </div>
                <div className="mt-1 text-[10px] text-sky-600">
                  Predictions labeled “Nowcast (live Cabo)” use the dynamic-Cabo path. The conservative day-ahead Forecast above is intentionally less aggressive for planning.
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-sky-700">No live Cabo yet — Nowcast activates automatically when fresh observations arrive for today.</p>
            )}

            {/* Phase 5 rerun recommendation surfaced from the latest successful generator run */}
            {(() => {
              const latestGenRun = (dashboard.recentWorkerRuns || []).find(
                (r) => r.workerName === 'fx-generate-predictions' && r.status === 'success' && r.metadata?.rerunRecommendation
              );
              const rec = latestGenRun?.metadata?.rerunRecommendation;
              if (rec && rec.nextRunInMinutes) {
                return (
                  <p className="mt-2 text-[11px] font-medium text-sky-900">
                    Next automatic tightening recommended in ~{rec.nextRunInMinutes} min (event-driven + 20-min safety-net cron).
                  </p>
                );
              }
              return null;
            })()}

            <div className="mt-3 text-[10px] text-sky-600">
              This block is part of the continuous prediction experience. The morning conservative Forecast remains visible above for multi-day planning.
            </div>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-base font-semibold">Report conditions</h2>
        <p className="mt-1 text-sm text-ink/70">One tap — helps train bay kick-in labels.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLocationSlug("cascais-bay")}
            className={`rounded-md px-3 py-1.5 text-sm ${locationSlug === "cascais-bay" ? "bg-ink text-white" : "bg-white border border-ink/20"}`}
          >
            Cascais Bay
          </button>
          <button
            type="button"
            onClick={() => setLocationSlug("cabo-raso")}
            className={`rounded-md px-3 py-1.5 text-sm ${locationSlug === "cabo-raso" ? "bg-ink text-white" : "bg-white border border-ink/20"}`}
          >
            Cabo Raso
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {REPORT_OPTIONS.map((option) => (
            <button
              key={option.status}
              type="button"
              disabled={submitting}
              onClick={() => handleReport(option.status)}
              className="rounded-md border border-ink/20 bg-white px-3 py-3 text-sm font-medium hover:bg-ink/5 disabled:opacity-50"
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={caboFlatNote}
            onChange={(event) => setCaboFlatNote(event.target.checked)}
          />
          Cabo Raso windy, bay still flat
        </label>

        {message && <p className="mt-3 text-sm text-ink/80">{message}</p>}

        {dashboard.recentBayReports?.length > 0 && (
          <div className="mt-5 border-t border-amber-200 pt-4">
            <h3 className="text-sm font-medium">Recent bay reports</h3>
            <ul className="mt-2 space-y-1 text-sm text-ink/70">
              {dashboard.recentBayReports.map((report) => (
                <li key={report._id}>
                  {report.status} · {new Date(report.observedAt).toLocaleTimeString("en-GB", { timeZone: "Europe/Lisbon" })}
                  {report.notes ? ` · ${report.notes}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
