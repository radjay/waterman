import {
  DEFAULT_COORDS,
  THEME_STORAGE_KEY,
  autoTheme,
  nextThemeBoundary,
  resolveTheme,
  sunTimes,
  themeBootstrapScript,
} from "../theme";

const { lat, lon } = DEFAULT_COORDS;

/** Midsummer and midwinter in Cascais, as UTC instants. */
const JUN_21 = Date.UTC(2026, 5, 21, 12, 0, 0);
const DEC_21 = Date.UTC(2026, 11, 21, 12, 0, 0);

const hourUTC = (ms) => new Date(ms).getUTCHours() + new Date(ms).getUTCMinutes() / 60;

describe("sunTimes", () => {
  it("puts midsummer sunrise and sunset in the right UTC hours for Cascais", () => {
    const { sunrise, sunset } = sunTimes(lat, lon, JUN_21);
    // Cascais on the summer solstice: sunrise ~05:11 UTC, sunset ~20:05 UTC.
    expect(hourUTC(sunrise)).toBeGreaterThan(4.5);
    expect(hourUTC(sunrise)).toBeLessThan(5.8);
    expect(hourUTC(sunset)).toBeGreaterThan(19.5);
    expect(hourUTC(sunset)).toBeLessThan(20.6);
  });

  it("gives a much shorter midwinter day", () => {
    const summer = sunTimes(lat, lon, JUN_21);
    const winter = sunTimes(lat, lon, DEC_21);
    const summerLength = summer.sunset - summer.sunrise;
    const winterLength = winter.sunset - winter.sunrise;

    expect(winterLength).toBeLessThan(summerLength);
    // Cascais swings roughly 9.5h to 15h of daylight.
    expect(winterLength / 3600000).toBeGreaterThan(9);
    expect(winterLength / 3600000).toBeLessThan(10.5);
  });

  it("always returns sunrise before sunset", () => {
    for (let month = 0; month < 12; month++) {
      const { sunrise, sunset } = sunTimes(lat, lon, Date.UTC(2026, month, 15, 12));
      expect(sunrise).toBeLessThan(sunset);
    }
  });

  it("returns nulls above the arctic circle in midsummer rather than NaN", () => {
    // Longyearbyen — the sun does not set. cos(omega) falls outside [-1, 1].
    const { sunrise, sunset } = sunTimes(78.22, 15.65, JUN_21);
    expect(sunrise).toBeNull();
    expect(sunset).toBeNull();
  });
});

describe("autoTheme", () => {
  it("is day at local noon and night at local midnight", () => {
    expect(autoTheme(lat, lon, Date.UTC(2026, 5, 21, 12, 0))).toBe("day");
    expect(autoTheme(lat, lon, Date.UTC(2026, 5, 21, 2, 0))).toBe("night");
  });

  it("is night just before sunrise and day just after", () => {
    const { sunrise } = sunTimes(lat, lon, JUN_21);
    expect(autoTheme(lat, lon, sunrise - 60000)).toBe("night");
    expect(autoTheme(lat, lon, sunrise + 60000)).toBe("day");
  });

  it("is day just before sunset and night just after", () => {
    const { sunset } = sunTimes(lat, lon, JUN_21);
    expect(autoTheme(lat, lon, sunset - 60000)).toBe("day");
    expect(autoTheme(lat, lon, sunset + 60000)).toBe("night");
  });

  it("falls back to clock hours where the sun does not set", () => {
    expect(autoTheme(78.22, 15.65, JUN_21)).toMatch(/^(day|night)$/);
  });
});

describe("nextThemeBoundary", () => {
  it("is always in the future", () => {
    for (const at of [
      Date.UTC(2026, 5, 21, 2, 0),
      Date.UTC(2026, 5, 21, 12, 0),
      Date.UTC(2026, 5, 21, 23, 0),
    ]) {
      expect(nextThemeBoundary(lat, lon, at)).toBeGreaterThan(at);
    }
  });

  it("is within 24 hours, so the scheduled timer never saturates", () => {
    for (let h = 0; h < 24; h++) {
      const at = Date.UTC(2026, 5, 21, h, 0);
      const delta = nextThemeBoundary(lat, lon, at) - at;
      expect(delta).toBeLessThanOrEqual(24 * 3600000);
    }
  });

  it("crossing the boundary actually flips the resolved theme", () => {
    const at = Date.UTC(2026, 5, 21, 2, 0);
    const before = autoTheme(lat, lon, at);
    const boundary = nextThemeBoundary(lat, lon, at);
    expect(autoTheme(lat, lon, boundary + 1000)).not.toBe(before);
  });

  it("after sunset, points at tomorrow's sunrise rather than today's", () => {
    const { sunset } = sunTimes(lat, lon, JUN_21);
    const boundary = nextThemeBoundary(lat, lon, sunset + 60000);
    const tomorrow = sunTimes(lat, lon, sunset + 24 * 3600000);
    expect(boundary).toBe(tomorrow.sunrise);
  });
});

describe("resolveTheme", () => {
  it("honours a fixed preference regardless of time of day", () => {
    const noon = Date.UTC(2026, 5, 21, 12, 0);
    const midnight = Date.UTC(2026, 5, 21, 2, 0);
    expect(resolveTheme("night", noon)).toBe("night");
    expect(resolveTheme("day", midnight)).toBe("day");
  });

  it("computes from the sun for auto and for unknown values", () => {
    const noon = Date.UTC(2026, 5, 21, 12, 0);
    expect(resolveTheme("auto", noon)).toBe("day");
    expect(resolveTheme(null, noon)).toBe("day");
    expect(resolveTheme("nonsense", noon)).toBe("day");
  });
});

describe("themeBootstrapScript", () => {
  it("is syntactically valid and sets data-theme", () => {
    document.documentElement.removeAttribute("data-theme");
    // eslint-disable-next-line no-new-func
    new Function(themeBootstrapScript())();
    expect(document.documentElement.getAttribute("data-theme")).toMatch(/^(night|day)$/);
  });

  it("honours a stored preference", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "day");
    // eslint-disable-next-line no-new-func
    new Function(themeBootstrapScript())();
    expect(document.documentElement.getAttribute("data-theme")).toBe("day");
    localStorage.removeItem(THEME_STORAGE_KEY);
  });

  it("agrees with the module's own resolution — the two must not drift", () => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    // eslint-disable-next-line no-new-func
    new Function(themeBootstrapScript())();
    expect(document.documentElement.getAttribute("data-theme")).toBe(
      resolveTheme("auto", Date.now())
    );
  });

  it("falls back to night rather than throwing when storage is unavailable", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    document.documentElement.removeAttribute("data-theme");
    expect(() => new Function(themeBootstrapScript())()).not.toThrow();
    expect(document.documentElement.getAttribute("data-theme")).toMatch(/^(night|day)$/);
    if (original) Object.defineProperty(window, "localStorage", original);
  });
});
