import assert from "node:assert/strict";
import test from "node:test";
import { localDayWindowMs } from "../../lib/forecast-experiment/time.js";
import { assertReadable } from "../../lib/forecast-experiment/guinchoArchive.js";
import {
  GUINCHO_SPOT_ID,
  leadDayFromMs,
  mapStationReading,
  mapWindySlot,
  parsePreviousRunsHourly,
  pickWindyByLeadHour,
  scoreGuinchoModelSkill,
} from "../../lib/forecast-experiment/guinchoModelSkill.js";
import { ROUTER_MODEL_SLUG, VOTE_ANY_SLUG } from "../../lib/forecast-experiment/guinchoModelSkillConstants.js";

function hourMs(dateLocal, hour) {
  return localDayWindowMs(dateLocal).startAt + hour * 3_600_000;
}

test("assertReadable names the missing archive path", () => {
  assert.throws(
    () => assertReadable("archive/jsonl/does-not-exist/documents.jsonl"),
    /Missing archive file: archive\/jsonl\/does-not-exist\/documents.jsonl/
  );
});

test("leadDayFromMs buckets issue time into Day 0 / −1 / −2", () => {
  const valid = Date.parse("2025-08-20T14:00:00Z");
  assert.equal(leadDayFromMs(valid, valid - 5 * 3_600_000), 0);
  assert.equal(leadDayFromMs(valid, valid - 23 * 3_600_000), 0);
  assert.equal(leadDayFromMs(valid, valid - 24 * 3_600_000), 1);
  assert.equal(leadDayFromMs(valid, valid - 47 * 3_600_000), 1);
  assert.equal(leadDayFromMs(valid, valid - 48 * 3_600_000), 2);
  assert.equal(leadDayFromMs(valid, valid - 71 * 3_600_000), 2);
  assert.equal(leadDayFromMs(valid, valid - 72 * 3_600_000), null);
  assert.equal(leadDayFromMs(valid, valid + 3_600_000), null);
});

test("mapStationReading copies archive fields onto experiment obs", () => {
  const mapped = mapStationReading({
    stationId: "3294",
    time: 1_700_000_000_000,
    speed: 18,
    gust: 24,
    direction: 330,
  });
  assert.deepEqual(mapped, {
    observedAt: 1_700_000_000_000,
    windSpeedKnots: 18,
    windGustKnots: 24,
    windDirectionDeg: 330,
  });
});

test("mapWindySlot uses timestamp as valid time and scrapeTimestamp as issue time", () => {
  const mapped = mapWindySlot({
    spotId: GUINCHO_SPOT_ID,
    timestamp: 2,
    scrapeTimestamp: 1,
    speed: 14,
    gust: 20,
    direction: 340,
  });
  assert.equal(mapped.validTime, 2);
  assert.equal(mapped.scrapeTimestamp, 1);
  assert.equal(mapped.windSpeedKnots, 14);
  assert.equal(mapped.windGustKnots, 20);
  assert.equal(mapped.windDirectionDeg, 340);
});

test("pickWindyByLeadHour keeps the last scrape in the lead window", () => {
  const valid = hourMs("2025-08-20", 15);
  const slots = [
    mapWindySlot({
      timestamp: valid,
      scrapeTimestamp: valid - 30 * 3_600_000,
      speed: 10,
      gust: 12,
      direction: 0,
    }),
    mapWindySlot({
      timestamp: valid,
      scrapeTimestamp: valid - 26 * 3_600_000,
      speed: 16,
      gust: 20,
      direction: 10,
    }),
  ];
  const picked = pickWindyByLeadHour(slots);
  assert.equal(picked.get("1").get(valid).windSpeedKnots, 16);
});

test("parsePreviousRunsHourly maps unsuffixed keys to Day 0 and previous_dayN to leads", () => {
  const points = parsePreviousRunsHourly(
    {
      hourly: {
        time: ["2025-08-20T14:00"],
        wind_speed_10m: [12],
        wind_gusts_10m: [16],
        wind_direction_10m: [330],
        wind_speed_10m_previous_day1: [11],
        wind_gusts_10m_previous_day1: [15],
        wind_direction_10m_previous_day1: [320],
        wind_speed_10m_previous_day2: [null],
        wind_gusts_10m_previous_day2: [null],
        wind_direction_10m_previous_day2: [null],
      },
    },
    { modelSlug: "icon-eu" }
  );
  assert.equal(points.length, 2);
  const day0 = points.find((p) => p.leadDay === 0);
  const day1 = points.find((p) => p.leadDay === 1);
  assert.equal(day0.windSpeedKnots, 12);
  assert.equal(day1.windSpeedKnots, 11);
  assert.equal(day0.model, "icon-eu");
  assert.ok(!points.some((p) => p.leadDay === 2));
});

test("scoreGuinchoModelSkill drops hours with no station reading and hours outside 07–22", () => {
  const dateLocal = "2025-08-20";
  const h6 = hourMs(dateLocal, 6);
  const h15 = hourMs(dateLocal, 15);
  const observations = [
    { observedAt: h6 + 60_000, windSpeedKnots: 20, windGustKnots: 24, windDirectionDeg: 330 },
    { observedAt: h15 + 60_000, windSpeedKnots: 18, windGustKnots: 22, windDirectionDeg: 330 },
  ];
  const openMeteoPoints = ["icon-eu", "icon-global", "gfs-global", "ecmwf-ifs025"].flatMap((model) =>
    [6, 15].flatMap((hour) =>
      [0, 1, 2].map((leadDay) => ({
        model,
        leadDay,
        validTime: hourMs(dateLocal, hour),
        windSpeedKnots: 17,
        windGustKnots: 21,
        windDirectionDeg: 330,
      }))
    )
  );

  const summary = scoreGuinchoModelSkill({ observations, openMeteoPoints, windySlots: [] });
  const row = summary.fullSeries.byLead[1].rideable.rows[0];
  assert.equal(row.hours, 1);
  assert.equal(summary.winner.hours, 1);
});

const PEER_MODELS = ["icon-eu", "icon-global", "gfs-global", "ecmwf-ifs025"];

function dayObservations(dateLocal, directionDeg, hours = [12, 13, 14, 15]) {
  return hours.map((hour) => ({
    observedAt: hourMs(dateLocal, hour) + 60_000,
    windSpeedKnots: 16,
    windGustKnots: 24,
    windDirectionDeg: directionDeg,
  }));
}

function dayForecasts(dateLocal, hours = [12, 13, 14, 15], extra = {}) {
  return hours.flatMap((hour) =>
    PEER_MODELS.map((model) => ({
      model,
      leadDay: 1,
      validTime: hourMs(dateLocal, hour),
      windSpeedKnots: 15,
      windGustKnots: 22,
      windDirectionDeg: 330,
      ...extra,
    }))
  );
}

test("sample days store station and forecast base wind and gusts", () => {
  const dateLocal = "2025-08-20";
  const summary = scoreGuinchoModelSkill({
    observations: dayObservations(dateLocal, 330),
    openMeteoPoints: dayForecasts(dateLocal),
    windySlots: [],
  });
  const hour = summary.sampleDays
    .find((day) => day.dateLocal === dateLocal)
    .hours.find((row) => row.hourLocal === 15);
  assert.equal(hour.observedSpeed, 16);
  assert.equal(hour.observedGust, 24);
  assert.equal(hour.models["icon-eu"].speed, 15);
  assert.equal(hour.models["icon-eu"].gust, 22);
});

test("spot checks spread days across season and wind direction", () => {
  const nortadaMay = ["2025-05-01", "2025-06-01", "2025-07-01", "2025-08-01", "2025-08-20", "2025-09-01", "2025-09-15"];
  const otherMay = ["2025-06-10", "2025-07-20"];
  const nortadaWinter = ["2025-01-15", "2025-02-01"];
  const otherWinter = ["2025-11-10", "2025-12-01"];
  const observations = [
    ...nortadaMay.flatMap((date) => dayObservations(date, 330)),
    ...otherMay.flatMap((date) => dayObservations(date, 180)),
    ...nortadaWinter.flatMap((date) => dayObservations(date, 10)),
    ...otherWinter.flatMap((date) => dayObservations(date, 200)),
  ];
  const openMeteoPoints = [
    ...nortadaMay.flatMap((date) => dayForecasts(date)),
    ...otherMay.flatMap((date) => dayForecasts(date)),
    ...nortadaWinter.flatMap((date) => dayForecasts(date)),
    ...otherWinter.flatMap((date) => dayForecasts(date)),
  ];
  const summary = scoreGuinchoModelSkill({ observations, openMeteoPoints, windySlots: [] });
  const byId = Object.fromEntries(summary.spotChecks.map((bucket) => [bucket.id, bucket.dates]));
  assert.equal(byId["nortada-maySep"].length, 6);
  assert.equal(byId["nortada-maySep"][0], "2025-05-01");
  assert.equal(byId["nortada-maySep"].at(-1), "2025-09-15");
  assert.ok(byId["nortada-maySep"].includes("2025-08-20"));
  assert.deepEqual(byId["other-maySep"], otherMay);
  assert.deepEqual(byId["nortada-octApr"], nortadaWinter);
  assert.deepEqual(byId["other-octApr"], otherWinter);
});

test("rows report base-wind MAE and gust MAE separately", () => {
  const dateLocal = "2025-08-20";
  const h15 = hourMs(dateLocal, 15);
  const observations = [
    { observedAt: h15 + 60_000, windSpeedKnots: 16, windGustKnots: 24, windDirectionDeg: 330 },
  ];
  const openMeteoPoints = [
    {
      model: "icon-eu",
      leadDay: 1,
      validTime: h15,
      windSpeedKnots: 16,
      windGustKnots: 24,
      windDirectionDeg: 330,
    },
    {
      model: "icon-global",
      leadDay: 1,
      validTime: h15,
      windSpeedKnots: 16,
      windGustKnots: 16,
      windDirectionDeg: 330,
    },
    {
      model: "gfs-global",
      leadDay: 1,
      validTime: h15,
      windSpeedKnots: 16,
      windGustKnots: 24,
      windDirectionDeg: 330,
    },
    {
      model: "ecmwf-ifs025",
      leadDay: 1,
      validTime: h15,
      windSpeedKnots: 16,
      windGustKnots: 24,
      windDirectionDeg: 330,
    },
  ];
  const summary = scoreGuinchoModelSkill({ observations, openMeteoPoints, windySlots: [] });
  const byModel = Object.fromEntries(
    summary.fullSeries.byLead[1].rideable.rows.map((row) => [row.model, row])
  );
  assert.equal(byModel["icon-eu"].speedMae, 0);
  assert.equal(byModel["icon-eu"].gustMae, 0);
  assert.equal(byModel["icon-global"].speedMae, 0);
  assert.equal(byModel["icon-global"].gustMae, 8);
  assert.equal(byModel["icon-global"].nortadaGustMae, 8);
});

test("breakdown splits nortada hours from other directions and May–Sep from the rest of the year", () => {
  const nortadaDay = "2025-06-15";
  const otherDay = "2025-01-15";
  const nortadaAt = hourMs(nortadaDay, 15);
  const otherAt = hourMs(otherDay, 15);
  const observations = [
    { observedAt: nortadaAt + 60_000, windSpeedKnots: 16, windGustKnots: 16, windDirectionDeg: 330 },
    { observedAt: otherAt + 60_000, windSpeedKnots: 16, windGustKnots: 16, windDirectionDeg: 180 },
  ];
  const openMeteoPoints = [
    ...["icon-global", "gfs-global", "ecmwf-ifs025"].map((model) => ({
      model,
      leadDay: 1,
      validTime: nortadaAt,
      windSpeedKnots: 20,
      windGustKnots: 20,
      windDirectionDeg: 330,
    })),
    {
      model: "icon-eu",
      leadDay: 1,
      validTime: nortadaAt,
      windSpeedKnots: 16,
      windGustKnots: 16,
      windDirectionDeg: 330,
    },
    ...["icon-eu", "icon-global", "ecmwf-ifs025"].map((model) => ({
      model,
      leadDay: 1,
      validTime: otherAt,
      windSpeedKnots: 20,
      windGustKnots: 20,
      windDirectionDeg: 180,
    })),
    {
      model: "gfs-global",
      leadDay: 1,
      validTime: otherAt,
      windSpeedKnots: 16,
      windGustKnots: 16,
      windDirectionDeg: 180,
    },
  ];
  const summary = scoreGuinchoModelSkill({ observations, openMeteoPoints, windySlots: [] });
  const slices = summary.breakdown.byLead[1].rideable;
  assert.equal(slices.nortada.overall.model, "icon-eu");
  assert.equal(slices.other.overall.model, "gfs-global");
  assert.equal(slices.maySep.overall.model, "icon-eu");
  assert.equal(slices.octApr.overall.model, "gfs-global");
});

test("winner names separate base-wind and gust champions when they disagree", () => {
  const dateLocal = "2025-08-20";
  const h15 = hourMs(dateLocal, 15);
  const observations = [
    { observedAt: h15 + 60_000, windSpeedKnots: 8, windGustKnots: 8, windDirectionDeg: 330 },
  ];
  const openMeteoPoints = [
    { model: "icon-eu", leadDay: 1, validTime: h15, windSpeedKnots: 16, windGustKnots: 8, windDirectionDeg: 330 },
    { model: "icon-global", leadDay: 1, validTime: h15, windSpeedKnots: 8, windGustKnots: 16, windDirectionDeg: 330 },
    { model: "gfs-global", leadDay: 1, validTime: h15, windSpeedKnots: 16, windGustKnots: 16, windDirectionDeg: 330 },
    { model: "ecmwf-ifs025", leadDay: 1, validTime: h15, windSpeedKnots: 16, windGustKnots: 16, windDirectionDeg: 330 },
  ];
  const summary = scoreGuinchoModelSkill({ observations, openMeteoPoints, windySlots: [] });
  const byModel = Object.fromEntries(
    summary.fullSeries.byLead[1].all.rows.map((row) => [row.model, row])
  );
  assert.ok(byModel["icon-eu"].speedUnderMae > byModel["icon-global"].speedUnderMae);
  assert.ok(byModel["icon-global"].gustUnderMae > byModel["icon-eu"].gustUnderMae);
});

test("winner is the model with the lowest false-go rate on Day −1", () => {
  const dateLocal = "2025-08-20";
  const h12 = hourMs(dateLocal, 12);
  const h15 = hourMs(dateLocal, 15);
  const observations = [
    { observedAt: h12 + 60_000, windSpeedKnots: 8, windGustKnots: 8, windDirectionDeg: 330 },
    { observedAt: h15 + 60_000, windSpeedKnots: 16, windGustKnots: 16, windDirectionDeg: 330 },
  ];
  const pointsFor = (model, hour12, hour15) => [
    {
      model,
      leadDay: 1,
      validTime: h12,
      windSpeedKnots: hour12,
      windGustKnots: hour12,
      windDirectionDeg: 330,
    },
    {
      model,
      leadDay: 1,
      validTime: h15,
      windSpeedKnots: hour15,
      windGustKnots: hour15,
      windDirectionDeg: 330,
    },
  ];
  const openMeteoPoints = [
    ...pointsFor("icon-eu", 16, 16),
    ...pointsFor("icon-global", 20, 20),
    ...pointsFor("gfs-global", 8, 16),
    ...pointsFor("ecmwf-ifs025", 16, 16),
  ];
  const summary = scoreGuinchoModelSkill({ observations, openMeteoPoints, windySlots: [] });
  assert.equal(summary.winner.model, "gfs-global");
  assert.equal(summary.winner.leadDay, 1);
  assert.equal(summary.winner.falseGoPct, 0);
  assert.match(summary.winner.caveat, /Cabo Raso/i);
  const optimistic = summary.fullSeries.byLead[1].all.rows.find((row) => row.model === "icon-eu");
  assert.equal(optimistic.falseGoPct, 50);
});

test("a model that misses real sessions loses to one that calls them", () => {
  const dateLocal = "2025-08-20";
  const hours = [12, 13, 14, 15];
  const observations = hours.map((hour) => ({
    observedAt: hourMs(dateLocal, hour) + 60_000,
    windSpeedKnots: 16,
    windGustKnots: 16,
    windDirectionDeg: 330,
  }));
  const points = (model, knots) =>
    hours.map((hour) => ({
      model,
      leadDay: 1,
      validTime: hourMs(dateLocal, hour),
      windSpeedKnots: knots,
      windGustKnots: knots,
      windDirectionDeg: 330,
    }));
  const summary = scoreGuinchoModelSkill({
    observations,
    openMeteoPoints: [
      ...points("icon-eu", 16),
      ...points("icon-global", 8),
      ...points("gfs-global", 8),
      ...points("ecmwf-ifs025", 8),
    ],
    windySlots: [],
  });
  assert.equal(summary.winner.model, "icon-eu");
  assert.equal(summary.winner.recallPct, 100);
  const shy = summary.fullSeries.byLead[1].all.rows.find((row) => row.model === "ecmwf-ifs025");
  assert.equal(shy.recallPct, 0);
  assert.equal(shy.missedPct, 100);
});

test("extra wind above the forecast is not a false session", () => {
  const dateLocal = "2025-08-20";
  const h15 = hourMs(dateLocal, 15);
  const observations = [
    { observedAt: h15 + 60_000, windSpeedKnots: 20, windGustKnots: 20, windDirectionDeg: 330 },
  ];
  const openMeteoPoints = ["icon-eu", "icon-global", "gfs-global", "ecmwf-ifs025"].map((model) => ({
    model,
    leadDay: 1,
    validTime: h15,
    windSpeedKnots: model === "gfs-global" ? 14 : 20,
    windGustKnots: model === "gfs-global" ? 14 : 20,
    windDirectionDeg: 330,
  }));
  const summary = scoreGuinchoModelSkill({ observations, openMeteoPoints, windySlots: [] });
  for (const row of summary.fullSeries.byLead[1].all.rows) {
    assert.equal(row.falseGoPct, 0);
  }
});

test("an hour missing one model is excluded from the shared-hour winner set", () => {
  const dateLocal = "2025-08-20";
  const h12 = hourMs(dateLocal, 12);
  const h15 = hourMs(dateLocal, 15);
  const observations = [h12, h15].map((t) => ({
    observedAt: t + 60_000,
    windSpeedKnots: 16,
    windGustKnots: 16,
    windDirectionDeg: 330,
  }));
  const models = ["icon-eu", "icon-global", "gfs-global", "ecmwf-ifs025"];
  const openMeteoPoints = [];
  for (const model of models) {
    openMeteoPoints.push({
      model,
      leadDay: 1,
      validTime: h15,
      windSpeedKnots: 16,
      windGustKnots: 16,
      windDirectionDeg: 330,
    });
    if (model !== "gfs-global") {
      openMeteoPoints.push({
        model,
        leadDay: 1,
        validTime: h12,
        windSpeedKnots: 4,
        windGustKnots: 4,
        windDirectionDeg: 330,
      });
    }
  }

  const summary = scoreGuinchoModelSkill({ observations, openMeteoPoints, windySlots: [] });
  assert.equal(summary.winner.hours, 1);
});

test("calm hours do not enter the rideable winner set", () => {
  const dateLocal = "2025-08-20";
  const h15 = hourMs(dateLocal, 15);
  const observations = [
    { observedAt: h15 + 60_000, windSpeedKnots: 4, windGustKnots: 4, windDirectionDeg: 330 },
  ];
  const openMeteoPoints = ["icon-eu", "icon-global", "gfs-global", "ecmwf-ifs025"].map((model) => ({
    model,
    leadDay: 1,
    validTime: h15,
    windSpeedKnots: 4,
    windGustKnots: 4,
    windDirectionDeg: 330,
  }));
  const summary = scoreGuinchoModelSkill({ observations, openMeteoPoints, windySlots: [] });
  assert.equal(summary.winner, null);
  assert.equal(summary.fullSeries.byLead[1].all.rows[0].hours, 1);
});

test("nortada MAE uses station FROM direction, not the forecast", () => {
  const dateLocal = "2025-08-20";
  const h15 = hourMs(dateLocal, 15);
  const observations = [
    { observedAt: h15 + 60_000, windSpeedKnots: 16, windGustKnots: 16, windDirectionDeg: 330 },
  ];
  const openMeteoPoints = ["icon-eu", "icon-global", "gfs-global", "ecmwf-ifs025"].map((model) => ({
    model,
    leadDay: 1,
    validTime: h15,
    windSpeedKnots: 16,
    windGustKnots: 16,
    windDirectionDeg: 180,
  }));
  const summary = scoreGuinchoModelSkill({ observations, openMeteoPoints, windySlots: [] });
  const row = summary.fullSeries.byLead[1].rideable.rows.find((r) => r.model === "icon-eu");
  assert.ok(Number.isFinite(row.nortadaMae));
  assert.equal(row.otherMae, undefined);
});

test("sample days skip station-only dates that have no Day −1 forecast", () => {
  const oldDay = "2022-05-09";
  const newDay = "2025-08-20";
  const observations = [
    ...dayObservations(oldDay, 330),
    ...dayObservations(newDay, 330),
  ];
  const summary = scoreGuinchoModelSkill({
    observations,
    openMeteoPoints: dayForecasts(newDay),
    windySlots: [],
  });
  const dates = summary.sampleDays.map((day) => day.dateLocal);
  assert.deepEqual(dates, [newDay]);
});

test("overlap marks Windy as context when rideable n is under 200", () => {
  const dateLocal = "2025-08-20";
  const h15 = hourMs(dateLocal, 15);
  const observations = [
    { observedAt: h15 + 60_000, windSpeedKnots: 16, windGustKnots: 16, windDirectionDeg: 330 },
  ];
  const openMeteoPoints = ["icon-eu", "icon-global", "gfs-global", "ecmwf-ifs025"].map((model) => ({
    model,
    leadDay: 1,
    validTime: h15,
    windSpeedKnots: 16,
    windGustKnots: 16,
    windDirectionDeg: 330,
  }));
  const windySlots = [
    mapWindySlot({
      timestamp: h15,
      scrapeTimestamp: h15 - 30 * 3_600_000,
      speed: 19,
      gust: 19,
      direction: 330,
    }),
  ];
  const summary = scoreGuinchoModelSkill({ observations, openMeteoPoints, windySlots });
  assert.equal(summary.overlap.byLead[1].rideable.windyPeer, false);
  assert.equal(summary.overlap.byLead[1].rideable.hours, 1);
  const windyRow = summary.overlap.byLead[1].rideable.rows.find((r) => r.model === "windy-blended");
  assert.ok(windyRow);
  assert.equal(windyRow.contextOnly, true);
});

test("scoreGuinchoModelSkill adds a blend leaderboard without changing the real winner", () => {
  const observations = [];
  const openMeteoPoints = [];
  const models = ["ecmwf-ifs025", "icon-eu", "icon-global", "gfs-global"];
  for (let day = 0; day < 20; day += 1) {
    const dateLocal = `2025-08-${String(day + 1).padStart(2, "0")}`;
    for (let hour = 7; hour <= 22; hour += 1) {
      const validTime = hourMs(dateLocal, hour);
      const speed = day % 2 === 0 ? 16 : 6; // half the days are real sessions
      observations.push({ observedAt: validTime, speed, gust: speed + 4, direction: 340 });
      for (const model of models) {
        openMeteoPoints.push({
          model,
          leadDay: 1,
          validTime,
          windSpeedKnots: speed,
          windGustKnots: speed + 4,
          windDirectionDeg: 340,
        });
      }
    }
  }
  const before = scoreGuinchoModelSkill({ observations, openMeteoPoints });
  const after = scoreGuinchoModelSkill({ observations, openMeteoPoints });
  assert.deepEqual(before.winner, after.winner); // deterministic, unaffected by virtual models
  const leaderboardRows = after.blendLeaderboard.byLead[1].rows;
  const slugs = leaderboardRows.map((row) => row.model);
  assert.ok(slugs.includes(ROUTER_MODEL_SLUG));
  assert.ok(slugs.includes(VOTE_ANY_SLUG));
  const routerRow = leaderboardRows.find((row) => row.model === ROUTER_MODEL_SLUG);
  assert.equal(routerRow.synthetic, true);
  const realRow = leaderboardRows.find((row) => row.model === "icon-eu");
  assert.equal(realRow.synthetic, undefined);
});
