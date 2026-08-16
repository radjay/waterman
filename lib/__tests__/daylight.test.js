import { describe, it, expect, vi, afterEach } from "vitest";
import { isDarkForSession } from "../daylight";

const GUINCHO = { latitude: 38.7327, longitude: -9.4725 };
// Mid-August at Guincho: sunrise ~06:50, sunset ~20:25 local (WEST Europe).
const DAY = new Date("2026-08-16T12:00:00+01:00").getTime();
const AFTER_SUNSET = new Date("2026-08-16T21:30:00+01:00").getTime();
const PRE_DAWN = new Date("2026-08-16T03:00:00+01:00").getTime();
const JUST_BEFORE_SUNRISE = new Date("2026-08-16T06:00:00+01:00").getTime();

describe("isDarkForSession", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is false in midday daylight at a coastal spot", () => {
    expect(isDarkForSession(GUINCHO, DAY)).toBe(false);
  });

  it("is true after sunset even when conditions would score well", () => {
    expect(isDarkForSession(GUINCHO, AFTER_SUNSET)).toBe(true);
  });

  it("is true well before sunrise (whole pre-dawn window)", () => {
    expect(isDarkForSession(GUINCHO, PRE_DAWN)).toBe(true);
    // Still dark an hour-ish before sunrise — not only the deep night.
    expect(isDarkForSession(GUINCHO, JUST_BEFORE_SUNRISE)).toBe(true);
  });

  it("falls back to clock hours when the spot has no coordinates", () => {
    expect(isDarkForSession({}, new Date("2026-08-16T23:00:00").getTime())).toBe(true);
    expect(isDarkForSession(null, new Date("2026-08-16T12:00:00").getTime())).toBe(false);
  });
});
