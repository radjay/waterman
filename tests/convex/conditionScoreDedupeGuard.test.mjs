import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(path.join(__dirname, "../..", p), "utf8");

const spots = read("convex/spots.ts");
const journal = read("convex/journal.ts");
const admin = read("convex/admin.ts");

/**
 * saveConditionScore deduped system scores on `slotId`. A scrape writes a NEW
 * forecast_slots document for an hour it has already forecast — that is why
 * dedupeSlotsByTimestamp exists — so the lookup never matched a previous
 * scrape's score and the replace branch was dead code. Every one of the four
 * daily scrapes inserted another copy of a score that already existed.
 *
 * ~27 rows accumulated per (spot, sport, hour), and getReportData read all of
 * them to return one: 29,747 documents / 15.9MB against Convex limits of 32,000
 * / 16MB. At ~4,250 documents per spot the eighth spot would have breached both
 * and taken the query from slow to failing.
 *
 * This is the second time this query has approached the limits
 * (docs/plans/2026-04-10-003). That round fixed four other read paths and
 * explicitly deferred condition_scores; the deferral is what regressed.
 *
 * A behavioural test would need a Convex deployment, which this repo's workflow
 * forbids from an agent and which shares one deployment with production anyway.
 * A source-level assertion is a weak substitute in general — it pins the shape
 * of the code, not its behaviour — but the regression here IS a shape: one
 * index name in place of another, silent, and invisible to every other test.
 */
describe("condition_scores dedupe key", () => {
  it("keys the system-score dedupe on the hour, not the slot document", () => {
    const handler = spots.slice(
      spots.indexOf("export const saveConditionScore"),
      spots.indexOf("export const", spots.indexOf("export const saveConditionScore") + 1)
    );
    assert.ok(handler.length > 0, "could not locate saveConditionScore");
    assert.match(handler, /by_spot_sport_timestamp/);
    assert.doesNotMatch(
      handler,
      /by_slot_sport/,
      "slotId is new on every scrape, so a slotId-keyed dedupe never matches"
    );
  });

  it("repoints the score row at the slot it just scored", () => {
    // The old patch left slotId/scrapeTimestamp on the row's original slot.
    // Harmless while rows were slot-keyed; wrong now that one row stands for
    // every scrape of that hour.
    const patch = spots.slice(spots.indexOf("Update existing system score"));
    assert.match(patch.slice(0, 600), /slotId: args\.slotId/);
    assert.match(patch.slice(0, 600), /scrapeTimestamp: args\.scrapeTimestamp/);
  });

  it("leaves no reader resolving condition_scores by slotId", () => {
    // These are the readers that made the obvious fix wrong: journal resolves a
    // logged session's forecast comparison from the stored slotId, and would
    // have silently blanked rather than thrown once duplicates collapsed.
    for (const [name, source] of [
      ["convex/journal.ts", journal],
      ["convex/admin.ts", admin],
      ["convex/spots.ts", spots],
    ]) {
      const usages = [...source.matchAll(/by_slot_sport/g)];
      const nearScores = usages.filter((m) => {
        const before = source.slice(Math.max(0, m.index - 300), m.index);
        return /condition_scores/.test(before);
      });
      assert.equal(
        nearScores.length,
        0,
        `${name} still queries condition_scores via by_slot_sport`
      );
    }
  });
});

describe("pruneDuplicateConditionScores", () => {
  const prune = spots.slice(spots.indexOf("export const pruneDuplicateConditionScores"));

  it("defaults to a dry run", () => {
    // It deletes live rows on a deployment shared with production. The default
    // invocation must report, not destroy.
    assert.match(prune, /const apply = args\.apply \?\? false/);
  });

  it("never touches personalized scores", () => {
    // Only the scraper duplicates rows; userId !== null scores are one-of-a-kind.
    assert.match(prune, /if \(score\.userId !== null\) continue/);
  });

  it("keeps the newest row per key", () => {
    // Matching how the read path resolved duplicates, so no displayed score moves.
    assert.match(prune, /_creationTime > a\._creationTime/);
    assert.match(prune, /if \(score\._id === newest\._id\) continue/);
  });
});
