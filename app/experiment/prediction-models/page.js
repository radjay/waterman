"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  listAnalysisSeasonOptions,
} from "../../../lib/forecast-experiment/analysisSeasons.js";
import {
  DEFAULT_RIDEABILITY_PRESET,
  RIDEABILITY_THRESHOLD_PRESETS,
} from "../../../lib/forecast-experiment/rideabilityThresholds.js";

const DEFAULT_SEASON_ID = "2025";

const PRESET_LABELS = {
  windfoil: "Windfoil (10 kt)",
  "wingfoil-light": "Light wing (12 kt)",
  "wingfoil-heavy": "Heavy wing (15 kt)",
};

const PRESET_ORDER = ["windfoil", "wingfoil-light", "wingfoil-heavy"];

const MODEL_CARDS = {
  v2: {
    title: "bay-wind-v2",
    subtitle: "Rule-based · live worker",
    description:
      "ICON7 previous-day forecast with mined bias and Cabo→bay lag tables. Explainable and fast to tune. Switches to nowcast when Cabo obs are fresh.",
  },
  v3: {
    title: "bay-wind-v3.5-ml",
    subtitle: "Calibrated ML",
    description:
      "Gradient-boosted multi-model features with a rideable-day gate and tuned probability thresholds per preset. Targets v3 timing with fewer false positives.",
  },
  v4: {
    title: "bay-wind-v4-ensemble",
    subtitle: "v2 + v3 hybrid",
    description:
      "Combines rule-based v2 and ML v3: gates on both models for no-kick days, blends kick-in timing when both predict rideable. Targets v3 accuracy with v2 false-positive control.",
  },
};

function formatMinutes(value) {
  return Number.isFinite(value) ? `${Math.round(value)} min` : "—";
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : "—";
}

function formatWithinHour(summary) {
  if (!summary?.daysComparable) return "—";
  return `${summary.withinHourCount}/${summary.daysComparable}`;
}

function pickBetterMetric(v2Value, v3Value, lowerIsBetter = true) {
  if (!Number.isFinite(v2Value) || !Number.isFinite(v3Value)) return null;
  if (v2Value === v3Value) return null;
  if (lowerIsBetter) return v2Value < v3Value ? "v2" : "v3";
  return v2Value > v3Value ? "v2" : "v3";
}

function cellClass(winner, model) {
  if (winner !== model) return "tabular-nums text-ink/80";
  return "tabular-nums font-semibold text-emerald-800";
}

function buildHeadline(v2, v3) {
  if (!v2 || !v3) return null;
  const v2Mae = v2.meanAbsoluteErrorMinutes;
  const v3Mae = v3.meanAbsoluteErrorMinutes;
  if (!Number.isFinite(v2Mae) || !Number.isFinite(v3Mae)) return null;

  const maeDelta = v2Mae - v3Mae;
  const fpDelta = (v3.falsePositiveCount ?? 0) - (v2.falsePositiveCount ?? 0);

  if (maeDelta > 30) {
    const fpNote =
      fpDelta > 10
        ? ` v3 also predicts more false kick-ins (+${fpDelta} days) — verify on the day backtest before switching.`
        : "";
    return `v3 predicts kick-in about ${Math.round(maeDelta)} minutes closer on average.${fpNote}`;
  }
  if (maeDelta < -30) {
    return `v2 is closer on kick-in timing for this season and threshold — the rule-based model wins here.`;
  }
  return `v2 and v3 are within ~${Math.abs(Math.round(maeDelta))} minutes on average kick-in error — compare false +/- counts below.`;
}

export default function PredictionModelsPage() {
  const seasonOptions = listAnalysisSeasonOptions();
  const [seasonId, setSeasonId] = useState(DEFAULT_SEASON_ID);
  const [preset, setPreset] = useState(DEFAULT_RIDEABILITY_PRESET);
  const [result, setResult] = useState(undefined);
  const [loadError, setLoadError] = useState(null);

  const loadOverview = useCallback(async (nextSeasonId, signal) => {
    setResult(undefined);
    setLoadError(null);
    const params = new URLSearchParams({ season: nextSeasonId, allPresets: "1" });
    let response;
    try {
      response = await fetch(`/api/experiment/prediction-overview?${params}`, { signal });
    } catch (error) {
      if (error.name === "AbortError") throw error;
      throw new Error(
        "Could not reach the dev server. If you just restarted it, wait a few seconds and refresh — first load can take 1–2 minutes."
      );
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error(`Invalid response from server (HTTP ${response.status}).`);
    }

    if (!response.ok) throw new Error(payload.error ?? "Failed to load overview");
    if (!payload.ok) throw new Error(payload.error ?? "No overview data");
    return payload;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 8 * 60 * 1000);

    loadOverview(seasonId, controller.signal)
      .then((payload) => {
        if (!controller.signal.aborted) setResult(payload);
      })
      .catch((error) => {
        if (controller.signal.aborted && !timedOut) return;
        if (error.name === "AbortError" && timedOut) {
          setLoadError("Overview timed out. Try a single summer instead of Average.");
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
  }, [seasonId, loadOverview]);

  const presetData = result?.byPreset?.[preset];
  const v1 = presetData?.v1?.summary;
  const v2 = presetData?.v2?.summary;
  const v3 = presetData?.v3?.summary;
  const v4 = presetData?.v4?.summary;
  const v3Label = presetData?.v3?.modelVersionLabel ?? MODEL_CARDS.v3.title;
  const v4Label = presetData?.v4?.modelVersionLabel ?? MODEL_CARDS.v4.title;
  const loading = result === undefined && loadError == null;

  const headline = useMemo(() => buildHeadline(v2, v3), [v2, v3]);
  const thresholdKt = RIDEABILITY_THRESHOLD_PRESETS[preset];

  return (
    <div className="space-y-6">
      <header className="rounded-lg border border-ink/15 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold">Bay kick-in models</h2>
        <p className="mt-1 text-sm text-ink/60">
          Compare rule-based v2, ML v3, and v4 hybrid against marina observations. v1 baseline shown for context.
        </p>

        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink/45">Season</p>
          <div className="flex flex-wrap gap-2">
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

          {(() => {
            const activeOption = seasonOptions.find((o) => o.id === seasonId);
            if (activeOption && activeOption.hasMarinaLabels === false) {
              return (
                <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  Marina anemometer offline since ~April 2026 — no new "observed" labels for {activeOption.label}.
                  Day-ahead metrics use weaker Cabo-inferred or report data. Nowcast work can still use live station readings.
                </div>
              );
            }
            return null;
          })()}
        </div>
      </header>

      {loading && (
        <p className="text-sm text-ink/60">
          Running v1, v2, v3, and v4 backtests for all rideability thresholds ({seasonOptions.find((o) => o.id === seasonId)?.label ?? seasonId})…
          first load can take 1–2 minutes; cached loads are instant.
        </p>
      )}
      {loadError && <p className="text-sm text-red-700">{loadError}</p>}

      {result?.ok && result.byPreset && (
        <section className="overflow-hidden rounded-lg border border-ink/15 bg-white shadow-sm">
          <div className="border-b border-ink/10 px-5 py-3">
            <h3 className="text-sm font-semibold">Results by rideability threshold</h3>
            <p className="text-xs text-ink/50">
              {result.seasonLabel}
              {result.window
                ? ` · ${result.window.startDateLocal} – ${result.window.endDateLocal}`
                : ""}
              {" · "}green = better between v2 and v3
            </p>
          </div>
          <div className="overflow-x-auto px-5 pb-4">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink/45">
                  <th className="pb-3 pr-3 font-medium">Threshold</th>
                  <th className="pb-3 pr-3 text-right font-medium">v2 MAE</th>
                  <th className="pb-3 pr-3 text-right font-medium">v3 MAE</th>
                  <th className="pb-3 pr-3 text-right font-medium">v4 MAE</th>
                  <th className="pb-3 pr-3 text-right font-medium">v2 ±1h</th>
                  <th className="pb-3 pr-3 text-right font-medium">v3 ±1h</th>
                  <th className="pb-3 pr-3 text-right font-medium">v2 false +/−</th>
                  <th className="pb-3 pr-3 text-right font-medium">v3 precision</th>
                  <th className="pb-3 text-right font-medium">v3 recall</th>
                </tr>
              </thead>
              <tbody>
                {PRESET_ORDER.map((presetId) => {
                  const row = result.byPreset[presetId];
                  if (!row) return null;
                  const rowV2 = row.v2?.summary;
                  const rowV3 = row.v3?.summary;
                  const rowV4 = row.v4?.summary;
                  const maeWinner = pickBetterMetric(
                    rowV2?.meanAbsoluteErrorMinutes,
                    rowV3?.meanAbsoluteErrorMinutes,
                    true
                  );
                  const withinWinner = pickBetterMetric(rowV2?.withinHourCount, rowV3?.withinHourCount, false);
                  const fpWinner = pickBetterMetric(rowV2?.falsePositiveCount, rowV3?.falsePositiveCount, true);
                  const fnWinner = pickBetterMetric(rowV2?.falseNegativeCount, rowV3?.falseNegativeCount, true);
                  const active = presetId === preset;

                  return (
                    <tr
                      key={presetId}
                      className={`border-t border-ink/10 ${active ? "bg-sky-50/60" : ""}`}
                    >
                      <td className="py-3 pr-3">
                        <button
                          type="button"
                          onClick={() => setPreset(presetId)}
                          className={`text-left ${active ? "font-semibold text-sky-900" : "text-ink/80 hover:text-ink"}`}
                        >
                          {PRESET_LABELS[presetId]}
                        </button>
                      </td>
                      <td className={`py-3 pr-3 text-right ${cellClass(maeWinner, "v2")}`}>
                        {formatMinutes(rowV2?.meanAbsoluteErrorMinutes)}
                      </td>
                      <td className={`py-3 pr-3 text-right ${cellClass(maeWinner, "v3")}`}>
                        {formatMinutes(rowV3?.meanAbsoluteErrorMinutes)}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-ink/80">
                        {formatMinutes(rowV4?.meanAbsoluteErrorMinutes)}
                      </td>
                      <td className={`py-3 pr-3 text-right ${cellClass(withinWinner, "v2")}`}>
                        {formatWithinHour(rowV2)}
                      </td>
                      <td className={`py-3 pr-3 text-right ${cellClass(withinWinner, "v3")}`}>
                        {formatWithinHour(rowV3)}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-ink/80">
                        {rowV2?.falsePositiveCount ?? "—"}/{rowV2?.falseNegativeCount ?? "—"}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-ink/80">
                        {formatPercent(rowV3?.rideablePrecision)}
                      </td>
                      <td className="py-3 text-right tabular-nums text-ink/80">
                        {formatPercent(rowV3?.rideableRecall)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {result?.ok && headline && (
        <section className="rounded-lg border border-sky-200 bg-sky-50 p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-800/80">
            {PRESET_LABELS[preset]}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-sky-950">{headline}</p>
          {result.window && (
            <p className="mt-2 text-xs text-sky-900/70">{thresholdKt} kt effective threshold</p>
          )}
        </section>
      )}

      {result?.ok && v2 && v3 && v4 && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {(["v2", "v3", "v4"]).map((key) => {
              const card = MODEL_CARDS[key];
              const summary = key === "v2" ? v2 : key === "v3" ? v3 : v4;
              const title =
                key === "v3" ? v3Label : key === "v4" ? v4Label : card.title;
              return (
                <section
                  key={key}
                  className="rounded-lg border border-ink/15 bg-white p-5 shadow-sm"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-ink/45">{card.subtitle}</p>
                  <h3 className="mt-1 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/65">{card.description}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-ink/45">Kick-in MAE</dt>
                      <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                        {formatMinutes(summary.meanAbsoluteErrorMinutes)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink/45">Within ±1h</dt>
                      <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                        {formatWithinHour(summary)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink/45">Precision</dt>
                      <dd className="mt-0.5 font-medium tabular-nums">
                        {formatPercent(summary.rideablePrecision)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink/45">Recall</dt>
                      <dd className="mt-0.5 font-medium tabular-nums">
                        {formatPercent(summary.rideableRecall)}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-xs tabular-nums text-amber-800">
                    False + {summary.falsePositiveCount ?? "—"} · False − {summary.falseNegativeCount ?? "—"}
                  </p>
                  <Link
                    href={`/experiment/backtest?season=${seasonId}&model=${key}&preset=${preset}`}
                    className="mt-4 inline-block text-sm text-sky-700 hover:text-sky-900"
                  >
                    Day-by-day backtest →
                  </Link>
                </section>
              );
            })}
          </div>

          {v1 && (
            <p className="text-xs text-ink/50">
              v1 baseline ({PRESET_LABELS[preset]}): MAE {formatMinutes(v1.meanAbsoluteErrorMinutes)}, within ±1h{" "}
              {formatWithinHour(v1)}, false + {v1.falsePositiveCount ?? "—"}, false −{" "}
              {v1.falseNegativeCount ?? "—"}. Live worker ships v2.
            </p>
          )}
        </>
      )}
    </div>
  );
}
