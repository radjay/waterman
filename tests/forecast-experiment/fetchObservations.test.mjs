import assert from "node:assert/strict";
import test from "node:test";
import { dateRangeWeeks } from "../../lib/forecast-experiment/time.js";

test("dateRangeWeeks splits a month into chunks no longer than seven days", () => {
  const weeks = dateRangeWeeks("2024-07-01", "2024-07-31");
  assert.ok(weeks.length >= 4);
  assert.equal(weeks[0].from, "2024-07-01");
  assert.equal(weeks.at(-1).to, "2024-07-31");
  for (const week of weeks) {
    assert.ok(week.from <= week.to);
  }
});
