import { afterEach, vi } from "vitest";
import {
  WIND_MODEL_ALLOWLIST,
  getAvailableModels,
  getForecastForModel,
  getModelForecasts,
  parseWidgetPayload,
  seriesSignature,
} from "../scraper";

const HOUR = 3600;
const base = Math.floor(Date.now() / 1000) + HOUR;

const rows = (speed) =>
  Array.from({ length: 24 }, (_, i) => ({
    timestamp: base + i * HOUR,
    windSpeed: speed + i * 0.1,
    windGust: speed + 2,
    windDirection: 330,
  }));

const payload = ({ model, speed = 8, available = WIND_MODEL_ALLOWLIST }) =>
  `window.wfwindyapp = ${JSON.stringify({
    model,
    available_models: available,
    data: JSON.stringify(rows(speed)),
  })};`;

const mockFetch = (handler) => {
  global.fetch = vi.fn(async (url) => {
    const model = new URL(url).searchParams.get("model");
    const body = handler(model);
    if (body === null) return { ok: false, status: 500 };
    return { ok: true, status: 200, text: async () => body };
  });
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseWidgetPayload", () => {
  it("extracts the assignment payload", () => {
    const data = parseWidgetPayload(payload({ model: "ecmwf" }));
    expect(data.model).toBe("ecmwf");
  });

  it("throws rather than returning junk when the wrapper changes", () => {
    // The endpoint is undocumented; a silent parse failure would be worse than
    // a loud one.
    expect(() => parseWidgetPayload("<html>nope</html>")).toThrow();
  });
});

describe("seriesSignature", () => {
  it("matches identical series and differs for different ones", () => {
    expect(seriesSignature(rows(8))).toBe(seriesSignature(rows(8)));
    expect(seriesSignature(rows(8))).not.toBe(seriesSignature(rows(12)));
  });

  it("survives an empty series", () => {
    expect(seriesSignature([])).toBe("");
    expect(seriesSignature(undefined)).toBe("");
  });
});

describe("getAvailableModels", () => {
  it("intersects the spot's list with the wind-model allowlist", () => {
    mockFetch(() =>
      payload({
        model: "gfs27_long",
        available: ["gfs27", "ecmwf", "iconeuro", "uvi", "silam", "gfs_wave", "cmems", "lew"],
      })
    );
    return expect(getAvailableModels("8512151")).resolves.toEqual([
      "ecmwf",
      "iconeuro",
      "lew",
    ]);
  });

  it("excludes the non-wind models the endpoint also advertises", async () => {
    mockFetch(() => payload({ model: "gfs27_long", available: ["uvi", "silam", "cmems"] }));
    await expect(getAvailableModels("8512151")).resolves.toEqual([]);
  });
});

describe("getForecastForModel", () => {
  it("accepts a model that echoes its own name", async () => {
    mockFetch((model) => payload({ model, speed: 10 }));
    const result = await getForecastForModel("8512151", "ecmwf");
    expect(result.model).toBe("ecmwf");
    expect(result.slots.length).toBeGreaterThan(0);
  });

  it("discards a substituted model (gdps, cfs echo back gfs27_long)", async () => {
    mockFetch(() => payload({ model: "gfs27_long" }));
    await expect(getForecastForModel("8512151", "gdps")).resolves.toBeNull();
  });

  it("converts wind from m/s to knots", async () => {
    mockFetch((model) => payload({ model, speed: 10 }));
    const { slots } = await getForecastForModel("8512151", "ecmwf");
    // 10 m/s = 19.4 kn
    expect(slots[0].speed).toBeCloseTo(19.4, 1);
  });

  it("drops slots already in the past", async () => {
    const past = [{ timestamp: 1000, windSpeed: 9, windGust: 12, windDirection: 330 }];
    mockFetch(
      () =>
        `window.wfwindyapp = ${JSON.stringify({
          model: "ecmwf",
          available_models: WIND_MODEL_ALLOWLIST,
          data: JSON.stringify(past),
        })};`
    );
    const { slots } = await getForecastForModel("8512151", "ecmwf");
    expect(slots).toHaveLength(0);
  });
});

describe("getModelForecasts", () => {
  it("keeps every model that returns a distinct series", async () => {
    const speeds = { ecmwf: 8, gfs27_long: 9, iconeuro: 10, iconglobal: 11, lew: 12 };
    mockFetch((model) => payload({ model, speed: speeds[model] }));
    const results = await getModelForecasts("8512151", WIND_MODEL_ALLOWLIST);
    expect(results.map((r) => r.model).sort()).toEqual([...WIND_MODEL_ALLOWLIST].sort());
  });

  it("discards arome, which echoes its own name but returns GFS data", async () => {
    // THE important case. The echo check passes; only content dedup catches it.
    // Without this, arome becomes a phantom opinion inflating every agreement
    // count — a permanent, invisible +1.
    mockFetch((model) => {
      if (model === "arome") return payload({ model: "arome", speed: 9 });
      return payload({ model, speed: model === "gfs27_long" ? 9 : 12 });
    });
    const results = await getModelForecasts("8512151", ["gfs27_long", "arome"]);
    expect(results.map((r) => r.model)).toEqual(["gfs27_long"]);
  });

  it("discards gfs27, which duplicates gfs27_long over our range", async () => {
    mockFetch((model) => payload({ model, speed: 9 }));
    const results = await getModelForecasts("8512151", ["gfs27_long", "gfs27"]);
    expect(results).toHaveLength(1);
  });

  it("keeps the first model seen when two are identical, deterministically", async () => {
    mockFetch((model) => payload({ model, speed: 9 }));
    const a = await getModelForecasts("8512151", ["ecmwf", "lew"]);
    const b = await getModelForecasts("8512151", ["ecmwf", "lew"]);
    expect(a.map((r) => r.model)).toEqual(["ecmwf"]);
    expect(b.map((r) => r.model)).toEqual(["ecmwf"]);
  });

  it("survives one model failing without losing the others", async () => {
    mockFetch((model) => (model === "lew" ? null : payload({ model, speed: model.length })));
    const results = await getModelForecasts("8512151", ["ecmwf", "lew", "iconeuro"]);
    expect(results.map((r) => r.model).sort()).toEqual(["ecmwf", "iconeuro"]);
  });

  it("returns an empty list rather than throwing when everything fails", async () => {
    // The blended default series must stay unaffected if model fetches die —
    // this is an undocumented parameter on an undocumented endpoint and must
    // not become a single point of failure for the core forecast.
    mockFetch(() => null);
    await expect(getModelForecasts("8512151", WIND_MODEL_ALLOWLIST)).resolves.toEqual([]);
  });
});
