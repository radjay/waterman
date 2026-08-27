import assert from "node:assert/strict";
import test from "node:test";
import { buildRouterPoints, indexPointsByHour } from "../../lib/forecast-experiment/guinchoBlendModels.js";
import { ROUTER_MODEL_SLUG } from "../../lib/forecast-experiment/guinchoModelSkillConstants.js";

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
