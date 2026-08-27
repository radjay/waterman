import assert from "node:assert/strict";
import test from "node:test";
import { buildBlendMean3Points, buildRouterPoints, buildVotePoints, buildWeightedBlendPoints, computeDirectionWeights, indexPointsByHour } from "../../lib/forecast-experiment/guinchoBlendModels.js";
import { BLEND_MEAN3_SLUG, BLEND_WEIGHTED_SLUG, ROUTER_MODEL_SLUG, VOTE_ANY_SLUG, VOTE_MAJORITY_SLUG } from "../../lib/forecast-experiment/guinchoModelSkillConstants.js";

function point(model, leadDay, validTime, { speed, gust, dir }) {
  return { model, leadDay, validTime, windSpeedKnots: speed, windGustKnots: gust, windDirectionDeg: dir };
}

test("indexPointsByHour groups by lead+time, model -> point", () => {
  const points = [point("icon-eu", 1, 100, { speed: 10, gust: 12, dir: 0 })];
  const byHour = indexPointsByHour(points);
  assert.equal(byHour.size, 1);
  assert.equal(byHour.get("1:100").get("icon-eu").windSpeedKnots, 10);
});

test("router picks ICON7 on a consensus-nortada hour", () => {
  const points = [
    point("ecmwf-ifs025", 1, 100, { speed: 20, gust: 24, dir: 350 }),
    point("icon-eu", 1, 100, { speed: 22, gust: 26, dir: 340 }),
    point("icon-global", 1, 100, { speed: 8, gust: 10, dir: 10 }),
    point("gfs-global", 1, 100, { speed: 21, gust: 25, dir: 355 }),
  ];
  const [routerPoint] = buildRouterPoints(points);
  assert.equal(routerPoint.model, ROUTER_MODEL_SLUG);
  assert.equal(routerPoint.windSpeedKnots, 22); // copied from icon-eu
});

test("router picks ICON13 on a consensus-other hour", () => {
  const points = [
    point("ecmwf-ifs025", 1, 100, { speed: 20, gust: 24, dir: 180 }),
    point("icon-eu", 1, 100, { speed: 22, gust: 26, dir: 340 }),
    point("icon-global", 1, 100, { speed: 15, gust: 18, dir: 190 }),
    point("gfs-global", 1, 100, { speed: 21, gust: 25, dir: 185 }),
  ];
  const [routerPoint] = buildRouterPoints(points);
  assert.equal(routerPoint.windSpeedKnots, 15); // copied from icon-global
});

test("router tie (2-2) defers to icon-eu's own classification", () => {
  const points = [
    point("ecmwf-ifs025", 1, 100, { speed: 20, gust: 24, dir: 0 }), // nortada
    point("icon-eu", 1, 100, { speed: 22, gust: 26, dir: 0 }), // nortada, tiebreak model
    point("icon-global", 1, 100, { speed: 15, gust: 18, dir: 180 }), // other
    point("gfs-global", 1, 100, { speed: 21, gust: 25, dir: 180 }), // other
  ];
  const [routerPoint] = buildRouterPoints(points);
  assert.equal(routerPoint.windSpeedKnots, 22); // icon-eu classified nortada -> icon-eu chosen
});

test("router skips an hour missing one of the four voting models", () => {
  const points = [
    point("icon-eu", 1, 100, { speed: 22, gust: 26, dir: 340 }),
    point("icon-global", 1, 100, { speed: 15, gust: 18, dir: 190 }),
    point("gfs-global", 1, 100, { speed: 21, gust: 25, dir: 185 }),
  ];
  assert.equal(buildRouterPoints(points).length, 0);
});

function votePointsByModel(points) {
  const byModel = {};
  for (const point of points) byModel[point.model] = point;
  return byModel;
}

test("vote-any fires when only one of three members is >= 12kt, vote-majority does not", () => {
  const points = [
    { model: "icon-eu", leadDay: 1, validTime: 100, windSpeedKnots: 14, windGustKnots: 16, windDirectionDeg: 340 },
    { model: "icon-global", leadDay: 1, validTime: 100, windSpeedKnots: 6, windGustKnots: 8, windDirectionDeg: 340 },
    { model: "gfs-global", leadDay: 1, validTime: 100, windSpeedKnots: 5, windGustKnots: 7, windDirectionDeg: 340 },
  ];
  const byModel = votePointsByModel(buildVotePoints(points));
  const anyEffective = (byModel[VOTE_ANY_SLUG].windSpeedKnots + byModel[VOTE_ANY_SLUG].windGustKnots) / 2;
  const majorityEffective = (byModel[VOTE_MAJORITY_SLUG].windSpeedKnots + byModel[VOTE_MAJORITY_SLUG].windGustKnots) / 2;
  assert.ok(anyEffective >= 12, `vote-any should read >= 12kt, got ${anyEffective}`);
  assert.ok(majorityEffective < 12, `vote-majority should read < 12kt, got ${majorityEffective}`);
});

test("vote-majority fires and matches vote-any when 2 of 3 members go", () => {
  const points = [
    { model: "icon-eu", leadDay: 1, validTime: 100, windSpeedKnots: 14, windGustKnots: 16, windDirectionDeg: 340 },
    { model: "icon-global", leadDay: 1, validTime: 100, windSpeedKnots: 13, windGustKnots: 15, windDirectionDeg: 340 },
    { model: "gfs-global", leadDay: 1, validTime: 100, windSpeedKnots: 5, windGustKnots: 7, windDirectionDeg: 340 },
  ];
  const byModel = votePointsByModel(buildVotePoints(points));
  const majorityEffective = (byModel[VOTE_MAJORITY_SLUG].windSpeedKnots + byModel[VOTE_MAJORITY_SLUG].windGustKnots) / 2;
  assert.ok(majorityEffective >= 12, `vote-majority should read >= 12kt, got ${majorityEffective}`);
});

test("vote-any reads < 12kt when no member goes", () => {
  const points = [
    { model: "icon-eu", leadDay: 1, validTime: 100, windSpeedKnots: 6, windGustKnots: 8, windDirectionDeg: 340 },
    { model: "icon-global", leadDay: 1, validTime: 100, windSpeedKnots: 5, windGustKnots: 7, windDirectionDeg: 340 },
    { model: "gfs-global", leadDay: 1, validTime: 100, windSpeedKnots: 4, windGustKnots: 6, windDirectionDeg: 340 },
  ];
  const byModel = votePointsByModel(buildVotePoints(points));
  const anyEffective = (byModel[VOTE_ANY_SLUG].windSpeedKnots + byModel[VOTE_ANY_SLUG].windGustKnots) / 2;
  assert.ok(anyEffective < 12, `vote-any should read < 12kt, got ${anyEffective}`);
});

test("blend-mean3 is the plain mean of its three members", () => {
  const points = [
    { model: "icon-eu", leadDay: 1, validTime: 100, windSpeedKnots: 12, windGustKnots: 18, windDirectionDeg: 340 },
    { model: "icon-global", leadDay: 1, validTime: 100, windSpeedKnots: 15, windGustKnots: 21, windDirectionDeg: 340 },
    { model: "gfs-global", leadDay: 1, validTime: 100, windSpeedKnots: 18, windGustKnots: 24, windDirectionDeg: 340 },
  ];
  const [blendPoint] = buildBlendMean3Points(points);
  assert.equal(blendPoint.model, BLEND_MEAN3_SLUG);
  assert.equal(blendPoint.windSpeedKnots, 15); // (12+15+18)/3
  assert.equal(blendPoint.windGustKnots, 21); // (18+21+24)/3
});

test("blend-mean3 skips an hour missing one of the three members", () => {
  const points = [
    { model: "icon-eu", leadDay: 1, validTime: 100, windSpeedKnots: 12, windGustKnots: 18, windDirectionDeg: 340 },
    { model: "icon-global", leadDay: 1, validTime: 100, windSpeedKnots: 15, windGustKnots: 21, windDirectionDeg: 340 },
  ];
  assert.equal(buildBlendMean3Points(points).length, 0);
});

test("computeDirectionWeights normalises each bucket's weights to sum to 1", () => {
  const observedHours = [
    { dateLocal: "2025-08-01", regime: "nortada", validTime: 100, effectiveWindKnots: 14 },
    { dateLocal: "2025-08-02", regime: "non-nortada", validTime: 200, effectiveWindKnots: 6 },
  ];
  const realForecastIndex = new Map([
    ["icon-eu:1:100", { windSpeedKnots: 14, windGustKnots: 16, effectiveWindKnots: 15 }],
    ["icon-global:1:100", { windSpeedKnots: 6, windGustKnots: 8, effectiveWindKnots: 7 }],
    ["gfs-global:1:100", { windSpeedKnots: 6, windGustKnots: 8, effectiveWindKnots: 7 }],
    ["icon-eu:1:200", { windSpeedKnots: 6, windGustKnots: 8, effectiveWindKnots: 7 }],
    ["icon-global:1:200", { windSpeedKnots: 6, windGustKnots: 8, effectiveWindKnots: 7 }],
    ["gfs-global:1:200", { windSpeedKnots: 6, windGustKnots: 8, effectiveWindKnots: 7 }],
  ]);
  const weights = computeDirectionWeights(observedHours, realForecastIndex);
  for (const bucket of ["nortada", "other"]) {
    const total = Object.values(weights[bucket]).reduce((sum, value) => sum + value, 0);
    assert.ok(Math.abs(total - 1) < 1e-6, `${bucket} weights should sum to 1, got ${total}`);
  }
});

test("blend-weighted applies nortada weights on a consensus-nortada hour", () => {
  const points = [
    { model: "ecmwf-ifs025", leadDay: 1, validTime: 100, windSpeedKnots: 10, windGustKnots: 12, windDirectionDeg: 340 },
    { model: "icon-eu", leadDay: 1, validTime: 100, windSpeedKnots: 20, windGustKnots: 24, windDirectionDeg: 340 },
    { model: "icon-global", leadDay: 1, validTime: 100, windSpeedKnots: 10, windGustKnots: 12, windDirectionDeg: 340 },
    { model: "gfs-global", leadDay: 1, validTime: 100, windSpeedKnots: 10, windGustKnots: 12, windDirectionDeg: 340 },
  ];
  const weights = { nortada: { "icon-eu": 1, "icon-global": 0, "gfs-global": 0 }, other: { "icon-eu": 0, "icon-global": 1, "gfs-global": 0 } };
  const [blendPoint] = buildWeightedBlendPoints(points, weights);
  assert.equal(blendPoint.model, BLEND_WEIGHTED_SLUG);
  assert.equal(blendPoint.windSpeedKnots, 20); // all weight on icon-eu
});
