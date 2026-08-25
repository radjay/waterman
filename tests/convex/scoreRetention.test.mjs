import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  SCORE_CUTOFF_DAYS,
  SCORE_FUTURE_DAYS,
  scoreRetentionBounds,
  shouldDeleteExpiredSystemScore,
} from "../../lib/convex/scoreRetention.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(path.join(__dirname, "../..", p), "utf8");

const DAY = 24 * 60 * 60 * 1000;
const now = 1_700_000_000_000;
const bounds = scoreRetentionBounds(now);

describe("score retention window", () => {
  it("matches the 2-back / 7-forward read window", () => {
    assert.equal(SCORE_CUTOFF_DAYS, 2);
    assert.equal(SCORE_FUTURE_DAYS, 7);
    assert.equal(bounds.cutoffLow, now - 2 * DAY);
    assert.equal(bounds.cutoffHigh, now + 7 * DAY);
  });

  it("deletes a system score older than the backward cutoff", () => {
    assert.equal(
      shouldDeleteExpiredSystemScore(
        { userId: null, timestamp: bounds.cutoffLow - 1 },
        bounds
      ),
      true
    );
  });

  it("deletes a system score beyond the forward cutoff", () => {
    assert.equal(
      shouldDeleteExpiredSystemScore(
        { userId: null, timestamp: bounds.cutoffHigh + 1 },
        bounds
      ),
      true
    );
  });

  it("keeps a system score inside the window", () => {
    assert.equal(
      shouldDeleteExpiredSystemScore({ userId: null, timestamp: now }, bounds),
      false
    );
  });

  it("never deletes a personalized score outside the window", () => {
    assert.equal(
      shouldDeleteExpiredSystemScore(
        { userId: "user_1", timestamp: bounds.cutoffLow - DAY },
        bounds
      ),
      false
    );
  });
});

describe("score retention query shape", () => {
  const source = read("convex/scoreRetention.ts");
  const crons = read("convex/crons.ts");

  it("pages on by_spot_sport_timestamp and never collects the whole table", () => {
    assert.match(source, /by_spot_sport_timestamp/);
    assert.doesNotMatch(
      source,
      /query\("condition_scores"\)\.collect\(\)/
    );
  });

  it("is scheduled daily from convex crons", () => {
    assert.match(crons, /retainConditionScores/);
  });
});
