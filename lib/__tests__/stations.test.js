import { describe, it, expect } from "vitest";
import { classifyProximity, stationIdFromUrl, stationTargetsFromSpots } from "../stations";

const MARINA = { latitude: 38.6919, longitude: -9.4203 };
const GUINCHO = { latitude: 38.7333, longitude: -9.4733 };
const LAGOA = { latitude: 38.5058, longitude: -9.1728 };

describe("stationIdFromUrl", () => {
  it("extracts the id from a windguru station url", () => {
    expect(stationIdFromUrl("https://www.windguru.cz/station/2329")).toBe("2329");
  });

  it("returns null for a windguru url that is not a station", () => {
    expect(stationIdFromUrl("https://www.windguru.cz/48765")).toBeNull();
  });

  it("returns null for junk", () => {
    expect(stationIdFromUrl(null)).toBeNull();
    expect(stationIdFromUrl("")).toBeNull();
    expect(stationIdFromUrl("not a url")).toBeNull();
  });
});

describe("stationTargetsFromSpots", () => {
  it("dedupes spots that share one station and skips spots without a url", () => {
    const targets = stationTargetsFromSpots([
      { _id: "marina", liveReportUrl: "https://www.windguru.cz/station/2329" },
      { _id: "moitas", liveReportUrl: "https://www.windguru.cz/station/2329" },
      { _id: "guincho", liveReportUrl: "https://www.windguru.cz/station/3294" },
      { _id: "carcavelos", liveReportUrl: null },
    ]);

    expect(targets).toEqual([
      { stationId: "2329", spotIds: ["marina", "moitas"] },
      { stationId: "3294", spotIds: ["guincho"] },
    ]);
  });
});

describe("classifyProximity", () => {
  it("classifies the marina station as at-spot for Marina de Cascais", () => {
    const result = classifyProximity("2329", MARINA);
    expect(result.kind).toBe("at-spot");
    expect(result.station.name).toBe("Marina de Cascais");
  });

  it("classifies Cabo Raso as nearby for Guincho, about 2.9 km SSW", () => {
    const result = classifyProximity("3294", GUINCHO);
    expect(result.kind).toBe("nearby");
    expect(result.station.name).toBe("Cabo Raso");
    expect(result.distanceKm).toBeGreaterThan(2.8);
    expect(result.distanceKm).toBeLessThan(3.0);
    expect(result.bearingLabel).toBe("SSW");
  });

  // The safety property: an unknown station must never reach the verdict path.
  it("classifies an unmapped station as nearby, never at-spot", () => {
    const result = classifyProximity("15435", LAGOA);
    expect(result.kind).toBe("nearby");
    expect(result.station).toBeNull();
  });

  it("classifies a spot with no coordinates as nearby", () => {
    const result = classifyProximity("2329", { latitude: undefined, longitude: undefined });
    expect(result.kind).toBe("nearby");
  });
});
