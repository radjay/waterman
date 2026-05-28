import { getCardinalDirection } from "../utils.js";
import { getPredictedKickInAt } from "./predictionFields.js";
import { addDays, localDateKey } from "./time.js";
import { effectiveWindKnots } from "./units.js";
import {
  RIDING_WINDOW_END_HOUR,
  RIDING_WINDOW_START_HOUR,
  RIDING_WINDOW_TIMEZONE,
  clampKickInToRidingWindow,
  isWithinRidingWindow,
  resolveKickInInRidingWindow,
} from "./ridingWindow.js";

const TIMEZONE = RIDING_WINDOW_TIMEZONE;
const STRONG_WIND_KNOTS = 25;
const GOOD_WIND_KNOTS = 18;

function goHeadline({ isLive, peakForecastKnots }) {
  if (Number.isFinite(peakForecastKnots)) {
    if (peakForecastKnots >= STRONG_WIND_KNOTS) return isLive ? "Strong later" : "Strong";
    if (peakForecastKnots >= GOOD_WIND_KNOTS) return isLive ? "Good later" : "Good";
  }
  return isLive ? "Likely later" : "Likely";
}

const WINGFOIL_THRESHOLD_KT = 12;

export function formatLisbonTime(ms) {
  if (!ms) return null;
  return new Date(ms).toLocaleTimeString("en-GB", {
    timeZone: TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatLisbonDate(dateLocal, referenceMs = Date.now()) {
  const today = localDateKey(referenceMs, TIMEZONE);
  const tomorrow = addDays(today, 1);
  if (dateLocal === today) return "Today";
  if (dateLocal === tomorrow) return "Tomorrow";
  return new Date(`${dateLocal}T12:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: TIMEZONE,
    weekday: "short",
  });
}

export function formatRelativeMinutes(ms) {
  if (!ms) return null;
  const minutes = Math.max(0, Math.round((Date.now() - ms) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

export function getLocalHour(ms, timezone = TIMEZONE) {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(new Date(ms))
  );
}

function sessionProbabilityFrom(prediction) {
  return prediction?.inputs?.sessionProbability;
}

function sessionThresholdFrom(prediction) {
  return prediction?.inputs?.sessionThreshold ?? 0.5;
}

function resolveDisplayKickInMs(prediction, dateLocal) {
  if (!prediction) return undefined;
  const kickInThreshold = prediction.inputs?.kickInThreshold ?? 0.5;
  const sessionAllowed =
    !prediction.inputs?.sessionThreshold ||
    (sessionProbabilityFrom(prediction) ?? 0) >= sessionThresholdFrom(prediction);

  const resolved = resolveKickInInRidingWindow({
    dateLocal,
    kickInMinutes: prediction.inputs?.predictedKickInMinutes,
    probabilityTimeline: prediction.probabilityTimeline ?? [],
    kickInThreshold,
    sessionAllowed,
    timezone: TIMEZONE,
  });

  if (resolved != null) return resolved;
  if (prediction.inputs?.kickInWindowMedianMs != null) {
    return prediction.inputs.kickInWindowMedianMs;
  }
  if (
    getPredictedKickInAt(prediction) != null &&
    isWithinRidingWindow(getPredictedKickInAt(prediction), dateLocal, TIMEZONE)
  ) {
    return getPredictedKickInAt(prediction);
  }
  return undefined;
}

function formatKickInDisplay(kickInMs, sessionProbability) {
  if (!kickInMs) return null;
  const time = formatLisbonTime(kickInMs);
  if (!Number.isFinite(sessionProbability)) return time;
  return `${Math.round(sessionProbability * 100)}% · ${time}`;
}

function formatKickInWindowPlain(startMs, endMs) {
  if (!startMs || !endMs) return null;
  const start = formatLisbonTime(startMs);
  const end = formatLisbonTime(endMs);
  if (Math.abs(endMs - startMs) < 30 * 60_000) return start;
  return `${start}–${end}`;
}

function formatKickInWindowDisplay(startMs, endMs, sessionProbability) {
  const window = formatKickInWindowPlain(startMs, endMs);
  if (!window) return null;
  if (!Number.isFinite(sessionProbability)) return window;
  return `${Math.round(sessionProbability * 100)}% · ${window}`;
}

/** @returns {'go' | 'maybe' | 'skip'} */
export function rideVerdict({ predictedKickInAt, confidence, sessionProbability, sessionThreshold = 0.5 }) {
  if (!predictedKickInAt) return "skip";
  if ((sessionProbability ?? 0) < 0.25 && (confidence ?? 0) < 0.5) return "skip";
  if ((sessionProbability ?? 0) >= sessionThreshold || (confidence ?? 0) >= 0.55) return "go";
  if ((sessionProbability ?? 0) >= 0.35) return "maybe";
  return "skip";
}

function liveCaboEffectiveKt(caboObservation) {
  if (!caboObservation) return undefined;
  return effectiveWindKnots(caboObservation);
}

export function describeBayDay(
  prediction,
  { referenceMs = Date.now(), isLive = false, caboObservation, peakForecastKnots } = {}
) {
  const dateLocal =
    prediction?.forecastDateLocal ?? localDateKey(referenceMs, TIMEZONE);
  const todayKey = localDateKey(referenceMs, TIMEZONE);
  const dayLabel = formatLisbonDate(dateLocal, referenceMs);
  const localHour = getLocalHour(referenceMs);
  const sessionProbability = sessionProbabilityFrom(prediction);
  const sessionThreshold = sessionThresholdFrom(prediction);
  const kickInMs = resolveDisplayKickInMs(prediction, dateLocal);
  const rawWindowStartMs = prediction?.inputs?.kickInWindowStartMs;
  const rawWindowEndMs = prediction?.inputs?.kickInWindowEndMs;
  const windowStartMs =
    !isLive && rawWindowStartMs
      ? clampKickInToRidingWindow(rawWindowStartMs, dateLocal)
      : undefined;
  const windowEndMs =
    !isLive && rawWindowEndMs
      ? clampKickInToRidingWindow(rawWindowEndMs, dateLocal)
      : undefined;
  const hasKickInWindow =
    !isLive &&
    windowStartMs &&
    windowEndMs &&
    windowEndMs - windowStartMs >= 30 * 60_000;
  const kickInAtMs = isLive
    ? kickInMs
    : clampKickInToRidingWindow(
        hasKickInWindow
          ? prediction.inputs?.kickInWindowMedianMs ?? kickInMs
          : getPredictedKickInAt(prediction) ?? kickInMs,
        dateLocal
      );
  const kickInTimePlain = hasKickInWindow
    ? formatKickInWindowPlain(windowStartMs, windowEndMs)
    : kickInMs
      ? formatLisbonTime(kickInMs)
      : null;
  const kickInTime = hasKickInWindow
    ? formatKickInWindowDisplay(windowStartMs, windowEndMs, sessionProbability)
    : formatKickInDisplay(kickInMs, sessionProbability);
  const kickInWindowPlain = hasKickInWindow ? kickInTimePlain : null;
  const likelihoodPct = Number.isFinite(sessionProbability)
    ? Math.round(sessionProbability * 100)
    : null;
  const caboKt = liveCaboEffectiveKt(caboObservation);

  if (!prediction) {
    return {
      verdict: "skip",
      headline: "—",
      kickInTime: null,
      kickInTimePlain: null,
      kickInWindowPlain: null,
      kickInAtMs: null,
      likelihoodPct: null,
      dayLabel,
      dateLocal,
    };
  }

  // Same-day live view: respect clock and current Cabo, not stale afternoon kick-in.
  if (isLive && dateLocal === todayKey) {
    if (localHour >= RIDING_WINDOW_END_HOUR) {
      return {
        verdict: "skip",
        headline: "Done for today",
        kickInTime: kickInMs ? formatKickInDisplay(kickInMs, sessionProbability) : null,
        kickInTimePlain: kickInMs ? formatLisbonTime(kickInMs) : null,
        kickInWindowPlain: null,
        kickInAtMs: kickInMs ?? null,
        kickInPassed: kickInMs != null && kickInMs <= referenceMs,
        likelihoodPct,
        dayLabel,
        dateLocal,
      };
    }

    if (kickInMs && kickInMs <= referenceMs) {
      const activeNow = caboKt != null && caboKt >= WINGFOIL_THRESHOLD_KT;
      return {
        verdict: activeNow ? "go" : "skip",
        headline: activeNow ? "Good now" : "Done for today",
        kickInTime: formatKickInDisplay(kickInMs, sessionProbability),
        kickInTimePlain: formatLisbonTime(kickInMs),
        kickInWindowPlain: null,
        kickInAtMs: kickInMs,
        kickInPassed: true,
        likelihoodPct,
        dayLabel,
        dateLocal,
      };
    }

    if (kickInMs && kickInMs > referenceMs) {
      const verdict = rideVerdict({
        predictedKickInAt: kickInMs,
        confidence: prediction.confidence,
        sessionProbability,
        sessionThreshold,
      });
      const headlines = {
        skip: "Flat",
        go: goHeadline({ isLive: true, peakForecastKnots }),
        maybe: "Maybe later",
      };
      return {
        verdict,
        headline: headlines[verdict],
        kickInTime,
        kickInTimePlain,
        kickInWindowPlain,
        kickInAtMs: verdict === "skip" ? null : kickInAtMs,
        likelihoodPct,
        dayLabel,
        dateLocal,
      };
    }

    if (caboKt != null && caboKt < WINGFOIL_THRESHOLD_KT - 1) {
      return {
        verdict: "skip",
        headline: "Flat",
        kickInTime: null,
        kickInAtMs: null,
        likelihoodPct,
        dayLabel,
        dateLocal,
      };
    }
  }

  const verdict = rideVerdict({
    predictedKickInAt: kickInMs,
    confidence: prediction.confidence,
    sessionProbability,
    sessionThreshold,
  });

  const headlines = {
    skip: "Flat",
    go: goHeadline({ isLive, peakForecastKnots }),
    maybe: isLive ? "Maybe later" : "Uncertain",
  };

  return {
    verdict,
    headline: headlines[verdict],
    kickInTime: verdict === "skip" ? null : kickInTime,
    kickInTimePlain: verdict === "skip" ? null : kickInTimePlain,
    kickInWindowPlain: verdict === "skip" ? null : kickInWindowPlain,
    kickInAtMs: verdict === "skip" ? null : kickInAtMs ?? null,
    likelihoodPct,
    dayLabel,
    dateLocal,
  };
}

export function describeCaboLine(observation) {
  if (!observation) return null;
  const kt = Math.round(effectiveWindKnots(observation) ?? 0);
  const direction =
    observation.windDirectionDeg != null
      ? getCardinalDirection(observation.windDirectionDeg)
      : null;
  return direction ? `Cabo ${kt} kt ${direction}` : `Cabo ${kt} kt`;
}

export const REPORT_OPTIONS = [
  { status: "not_in", label: "Not yet" },
  { status: "marginal", label: "Getting there" },
  { status: "rideable", label: "Good" },
  { status: "strong", label: "Strong" },
];

export function formatReportStatus(status) {
  return REPORT_OPTIONS.find((option) => option.status === status)?.label ?? status;
}

export function formatKickInHistoryPlain(earliestKickInAtMs, latestKickInAtMs) {
  if (earliestKickInAtMs == null && latestKickInAtMs == null) return null;
  if (
    earliestKickInAtMs == null ||
    latestKickInAtMs == null ||
    earliestKickInAtMs === latestKickInAtMs
  ) {
    return formatLisbonTime(earliestKickInAtMs ?? latestKickInAtMs);
  }
  return `${formatLisbonTime(earliestKickInAtMs)} → ${formatLisbonTime(latestKickInAtMs)}`;
}

export function verdictDot(verdict) {
  if (verdict === "go") return "bg-emerald-500";
  if (verdict === "maybe") return "bg-amber-500";
  return "bg-stone-300";
}

export function verdictBg(verdict) {
  if (verdict === "go") return "bg-emerald-50 ring-emerald-100";
  if (verdict === "maybe") return "bg-amber-50 ring-amber-100";
  return "bg-white ring-ink/10";
}
