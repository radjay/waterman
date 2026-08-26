import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "path";
import {
  HISTORY_KEEP_DAYS,
  SCORING_LOG_KEEP_DAYS,
  historyCutoff,
  scoringLogCutoff,
  isOlderThanCutoff,
} from "../../lib/convex/historyRetention.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(path.join(__dirname, "../..", p), "utf8");

const DAY = 24 * 60 * 60 * 1000;
const now = 1_700_000_000_000;

describe("history retention window", () => {
  it("keeps 30 days of history and 7 days of scoring logs", () => {
    assert.equal(HISTORY_KEEP_DAYS, 30);
    assert.equal(SCORING_LOG_KEEP_DAYS, 7);
    assert.equal(historyCutoff(now), now - 30 * DAY);
    assert.equal(scoringLogCutoff(now), now - 7 * DAY);
  });

  it("deletes a station reading older than the cutoff", () => {
    assert.equal(
      isOlderThanCutoff({ time: now - 31 * DAY }, "time", historyCutoff(now)),
      true
    );
  });

  it("keeps a station reading inside the window", () => {
    assert.equal(
      isOlderThanCutoff({ time: now - 2 * DAY }, "time", historyCutoff(now)),
      false
    );
  });

  it("ignores rows with a missing time", () => {
    assert.equal(isOlderThanCutoff({}, "time", historyCutoff(now)), false);
  });
});

describe("history retention query shape", () => {
  const source = read("convex/historyRetention.ts");
  const crons = read("convex/crons.ts");

  it("pages deletes and never collects a whole fat table", () => {
    assert.match(source, /retainHistory/);
    assert.doesNotMatch(source, /query\("scoring_logs"\)\.collect\(\)/);
    assert.doesNotMatch(source, /query\("station_readings"\)\.collect\(\)/);
    assert.doesNotMatch(source, /query\("forecast_slots_archive"\)\.collect\(\)/);
  });

  it("is scheduled daily from convex crons", () => {
    assert.match(crons, /retainHistory/);
  });
});
