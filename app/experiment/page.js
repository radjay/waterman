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
  const prediction = dashboard?.latestPredictions?.[0];
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
            <p>{prediction.summary}</p>
            <p className="text-ink/70">
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
