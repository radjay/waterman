import { BANDS } from "../agreement";
import {
  detectWindows,
  soonestWindow,
  spotSummaries,
  windowTrackPosition,
} from "../windows";

const H = 60 * 60 * 1000;
const DAY = Date.UTC(2026, 7, 4, 0, 0, 0);
const at = (hour) => DAY + hour * H;

const slot = (hour, score, band = BANDS.GOOD) => ({
  timestamp: at(hour),
  score,
  band,
  speed: 22,
  direction: 330,
});

describe("detectWindows", () => {
  it("collapses contiguous good slots into one window", () => {
    const w = detectWindows([slot(9, 80), slot(12, 92), slot(15, 78)]);
    expect(w).toHaveLength(1);
    expect(w[0].start).toBe(at(9));
    // The window ends when the LAST slot's 3-hour period does, or 12:00-15:00
    // would render as 12:00-12:00.
    expect(w[0].end).toBe(at(18));
  });

  it("splits on a sub-threshold slot", () => {
    const w = detectWindows([slot(9, 80), slot(12, 40), slot(15, 78)]);
    expect(w).toHaveLength(2);
  });

  it("splits on a real gap in the data rather than bridging it", () => {
    const w = detectWindows([slot(6, 80), slot(18, 80)]);
    expect(w).toHaveLength(2);
  });

  it("marks the peak slot", () => {
    const w = detectWindows([slot(9, 70), slot(12, 92), slot(15, 78)]);
    expect(w[0].peak.timestamp).toBe(at(12));
    expect(w[0].score).toBe(92);
  });

  it("returns nothing on a flat day — the common case", () => {
    expect(detectWindows([slot(9, 41), slot(12, 38), slot(15, 44)])).toHaveLength(0);
  });

  it("survives empty and missing input", () => {
    expect(detectWindows([])).toEqual([]);
    expect(detectWindows(undefined)).toEqual([]);
  });

  it("includes an unscored split slot, since a split window is still an answer", () => {
    // Only when there is no score yet — a scored-41 slot is not a window just
    // because the models agree the wind clears a threshold.
    expect(detectWindows([slot(12, null, BANDS.SPLIT)])).toHaveLength(1);
    expect(detectWindows([slot(12, 41, BANDS.SPLIT)])).toHaveLength(0);
  });

  it("does not invent a window from model agreement alone on a flat day", () => {
    // Regression: qualifying on band OR score meant a 41 with the models
    // agreeing about wind became a "good window" on the busiest screen.
    expect(detectWindows([slot(9, 41, BANDS.GOOD), slot(12, 38, BANDS.GOOD)])).toHaveLength(0);
  });

  it("takes the worst honest band, so one split hour makes the window split", () => {
    // Averaging would hide exactly the disagreement the design wants surfaced.
    const w = detectWindows([slot(9, 80, BANDS.GOOD), slot(12, 80, BANDS.SPLIT)]);
    expect(w[0].band).toBe(BANDS.SPLIT);
  });

  it("reports UNKNOWN when every slot in the window lacks model data", () => {
    const w = detectWindows([slot(9, 80, BANDS.UNKNOWN), slot(12, 85, BANDS.UNKNOWN)]);
    expect(w[0].band).toBe(BANDS.UNKNOWN);
    expect(w[0].band).not.toBe(BANDS.SPLIT);
  });
});

describe("soonestWindow", () => {
  const guincho = { _id: "a", name: "Guincho" };
  const lagoa = { _id: "b", name: "Lagoa" };

  it("picks the earliest good window across all spots", () => {
    const best = soonestWindow(
      [
        { spot: guincho, windows: detectWindows([slot(15, 92)]) },
        { spot: lagoa, windows: detectWindows([slot(9, 80)]) },
      ],
      at(0)
    );
    expect(best.spot.name).toBe("Lagoa");
  });

  it("ignores windows that have already finished", () => {
    const best = soonestWindow(
      [{ spot: guincho, windows: detectWindows([slot(6, 90), slot(15, 80)]) }],
      at(12)
    );
    expect(best.window.start).toBe(at(15));
  });

  it("does not offer a split window as the soonest GOOD window", () => {
    const best = soonestWindow(
      [{ spot: guincho, windows: detectWindows([slot(9, null, BANDS.SPLIT)]) }],
      at(0)
    );
    expect(best).toBeNull();
  });

  it("returns null when nothing is on", () => {
    expect(soonestWindow([], at(0))).toBeNull();
    expect(soonestWindow(undefined, at(0))).toBeNull();
  });
});

describe("spotSummaries", () => {
  it("keeps spots with nothing and says so, rather than dropping them", () => {
    const rows = spotSummaries(
      [
        { spot: { name: "Guincho" }, windows: detectWindows([slot(9, 80)]) },
        { spot: { name: "Marina" }, windows: [] },
      ],
      at(0)
    );
    expect(rows).toHaveLength(2);
    expect(rows[1].spot.name).toBe("Marina");
    expect(rows[1].windowCount).toBe(0);
    expect(rows[1].soonest).toBeNull();
  });

  it("sorts empty spots last regardless of input order", () => {
    const rows = spotSummaries(
      [
        { spot: { name: "Empty" }, windows: [] },
        { spot: { name: "Busy" }, windows: detectWindows([slot(9, 80)]) },
      ],
      at(0)
    );
    expect(rows[0].spot.name).toBe("Busy");
  });
});

describe("windowTrackPosition", () => {
  const track = { dayStartHour: 6, dayEndHour: 24 };

  it("positions a midday window in the middle of the track", () => {
    const [w] = detectWindows([slot(12, 90)]);
    const pos = windowTrackPosition(w, DAY, track);
    // 12:00 is 6h into an 18h track.
    expect(pos.left).toBeCloseTo((6 / 18) * 100, 1);
    expect(pos.width).toBeCloseTo((3 / 18) * 100, 1);
  });

  it("clamps a window that starts before the visible hours", () => {
    // 04:00-07:00 overlaps a track starting at 06:00.
    const [w] = detectWindows([slot(4, 90)]);
    const pos = windowTrackPosition(w, DAY, track);
    expect(pos.left).toBe(0);
    expect(pos.width).toBeGreaterThan(0);
  });

  it("returns null for a window entirely outside the visible hours", () => {
    const [w] = detectWindows([slot(1, 90)]);
    // 01:00-04:00 ends before the 06:00 track start.
    expect(windowTrackPosition(w, DAY, track)).toBeNull();
  });

  it("marks the peak position inside the track", () => {
    const [w] = detectWindows([slot(9, 70), slot(12, 95)]);
    const pos = windowTrackPosition(w, DAY, track);
    expect(pos.peak).toBeCloseTo((6 / 18) * 100, 1);
  });

  it("never returns a width that overflows the track", () => {
    const [w] = detectWindows([slot(6, 90), slot(9, 90), slot(12, 90), slot(15, 90), slot(18, 90), slot(21, 90)]);
    const pos = windowTrackPosition(w, DAY, track);
    expect(pos.left + pos.width).toBeLessThanOrEqual(100.01);
  });
});
