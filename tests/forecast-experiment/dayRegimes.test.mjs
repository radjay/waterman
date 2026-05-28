import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyDayRegime,
  detectNortadaSignalInObservations,
  detectObservedNortada,
  filterObservationsToActiveNortadaWindow,
  firstSustainedNortadaCrossingBeforeHour,
  isInNortadaSeason,
  NORTADA_PEAK_THRESHOLD_KNOTS,
  REGIME_FLAT,
  REGIME_NORTADA,
  REGIME_OTHER,
  REGIME_SEA_BREEZE,
  summarizeActiveNortadaWindow,
} from "../../lib/forecast-experiment/dayRegimes.js";
import { localDayWindowMs } from "../../lib/forecast-experiment/time.js";

function obs(observedAt, speed, gust, directionDeg = 330) {
  return {
    observedAt,
    quality: "ok",
    windSpeedKnots: speed,
    windGustKnots: gust,
    windDirectionDeg: directionDeg,
  };
}

test("isInNortadaSeason covers spring through autumn", () => {
  assert.equal(isInNortadaSeason("2025-03-15"), true);
  assert.equal(isInNortadaSeason("2025-07-10"), true);
  assert.equal(isInNortadaSeason("2025-11-20"), true);
  assert.equal(isInNortadaSeason("2025-02-28"), false);
  assert.equal(isInNortadaSeason("2025-12-01"), false);
});

test("detectNortadaSignalInObservations accepts north direction on one reading of a pair", () => {
  const readings = [
    obs(1, 11, 13, 90),
    obs(1 + 20 * 60_000, 12, 14, 330),
  ];
  assert.ok(detectNortadaSignalInObservations(readings, { station: "cabo-raso" }));
});

test("detectNortadaSignalInObservations rejects sustained non-north wind", () => {
  const readings = [
    obs(1, 13, 15, 90),
    obs(1 + 20 * 60_000, 14, 16, 95),
  ];
  assert.equal(detectNortadaSignalInObservations(readings), null);
});

test("detectObservedNortada tags Cabo-only afternoon nortada without marina kick", () => {
  const dateLocal = "2025-07-10";
  const { startAt } = localDayWindowMs(dateLocal);
  const caboObservations = [
    obs(startAt + 15 * 3_600_000, 14, 16, 330),
    obs(startAt + 15 * 3_600_000 + 20 * 60_000, 15, 17, 340),
  ];

  assert.ok(
    detectObservedNortada({
      dateLocal,
      caboObservations,
      marinaObservations: [],
    })
  );
  assert.equal(
    classifyDayRegime({
      label: { dateLocal, actualKickInAt: null },
      caboObservations,
      marinaObservations: [],
      thresholdKnots: NORTADA_PEAK_THRESHOLD_KNOTS,
    }),
    REGIME_NORTADA
  );
});

test("detectObservedNortada can use marina alone when Cabo is missing", () => {
  const dateLocal = "2025-08-01";
  const { startAt } = localDayWindowMs(dateLocal);
  const marinaObservations = [
    obs(startAt + 13 * 3_600_000, 13, 15, 350),
    obs(startAt + 13 * 3_600_000 + 15 * 60_000, 14, 16, 340),
  ];

  assert.equal(
    classifyDayRegime({
      label: { dateLocal, actualKickInAt: null },
      caboObservations: [],
      marinaObservations,
      thresholdKnots: NORTADA_PEAK_THRESHOLD_KNOTS,
    }),
    REGIME_NORTADA
  );
});

test("firstSustainedNortadaCrossingBeforeHour requires north on at least one reading", () => {
  const dateLocal = "2025-07-10";
  const { startAt } = localDayWindowMs(dateLocal);
  const northWind = [
    obs(startAt + 9 * 3_600_000, 13, 15, 330),
    obs(startAt + 9 * 3_600_000 + 20 * 60_000, 14, 16, 350),
  ];
  const eastWind = [
    obs(startAt + 9 * 3_600_000, 13, 15, 90),
    obs(startAt + 9 * 3_600_000 + 20 * 60_000, 14, 16, 95),
  ];

  assert.ok(firstSustainedNortadaCrossingBeforeHour(northWind, 12, 12, dateLocal));
  assert.equal(firstSustainedNortadaCrossingBeforeHour(eastWind, 12, 12, dateLocal), undefined);
});

test("classifyDayRegime prefers stored dayRegime when present", () => {
  assert.equal(
    classifyDayRegime({
      label: { dateLocal: "2025-07-10", dayRegime: REGIME_SEA_BREEZE },
      caboObservations: [],
      thresholdKnots: 12,
    }),
    REGIME_SEA_BREEZE
  );
});

test("classifyDayRegime marks flat days without nortada signal and weak winds", () => {
  const dateLocal = "2025-07-11";
  const { startAt } = localDayWindowMs(dateLocal);
  const caboObservations = [obs(startAt + 10 * 3_600_000, 6, 8, 330)];

  assert.equal(
    classifyDayRegime({
      label: { dateLocal, actualKickInAt: null },
      caboObservations,
      thresholdKnots: 12,
    }),
    REGIME_FLAT
  );
});

test("classifyDayRegime marks sea-breeze on late kick with weak Cabo morning", () => {
  const dateLocal = "2025-07-12";
  const { startAt } = localDayWindowMs(dateLocal);
  const caboObservations = [obs(startAt + 10 * 3_600_000, 8, 9, 120)];

  assert.equal(
    classifyDayRegime({
      label: { dateLocal, actualKickInAt: startAt + 15 * 3_600_000 },
      caboObservations,
      thresholdKnots: 12,
    }),
    REGIME_SEA_BREEZE
  );
});

test("classifyDayRegime returns other when no station data exists", () => {
  assert.equal(
    classifyDayRegime({
      label: { dateLocal: "2025-07-10", actualKickInAt: Date.now() },
      caboObservations: [],
      marinaObservations: [],
      guinchoObservations: [],
      thresholdKnots: 12,
    }),
    REGIME_OTHER
  );
});

test("filterObservationsToActiveNortadaWindow keeps only readings above 10 kt", () => {
  const dateLocal = "2025-07-10";
  const { startAt } = localDayWindowMs(dateLocal);
  const readings = filterObservationsToActiveNortadaWindow(
    [
      obs(startAt + 10 * 3_600_000, 9, 11, 330),
      obs(startAt + 11 * 3_600_000, 12, 14, 330),
      obs(startAt + 12 * 3_600_000, 16, 18, 330),
    ],
    dateLocal
  );

  assert.equal(readings.length, 2);
  assert.deepEqual(summarizeActiveNortadaWindow(readings), {
    readingCount: 2,
    meanEffectiveKnots: 15,
    peakEffectiveKnots: 17,
  });
});

test("detectObservedNortada ignores winter months", () => {
  const dateLocal = "2025-02-10";
  const { startAt } = localDayWindowMs(dateLocal);
  const caboObservations = [
    obs(startAt + 12 * 3_600_000, 16, 18, 330),
    obs(startAt + 12 * 3_600_000 + 20 * 60_000, 17, 19, 340),
  ];

  assert.equal(
    detectObservedNortada({ dateLocal, caboObservations }),
    null
  );
});
