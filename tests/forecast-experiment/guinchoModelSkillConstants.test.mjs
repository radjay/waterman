import assert from "node:assert/strict";
import test from "node:test";
import {
  BLEND_MEAN3_SLUG,
  BLEND_WEIGHTED_SLUG,
  GUINCHO_VOTE_MODELS,
  ROUTER_MODEL_SLUG,
  ROUTER_TIEBREAK_MODEL,
  VIRTUAL_MODEL_LABELS,
  VIRTUAL_MODEL_SLUGS,
  VOTE_ANY_SLUG,
  VOTE_MAJORITY_SLUG,
} from "../../lib/forecast-experiment/guinchoModelSkillConstants.js";

test("virtual model slugs and labels stay in sync", () => {
  assert.deepEqual(
    [...VIRTUAL_MODEL_SLUGS].sort(),
    [ROUTER_MODEL_SLUG, VOTE_ANY_SLUG, VOTE_MAJORITY_SLUG, BLEND_MEAN3_SLUG, BLEND_WEIGHTED_SLUG].sort()
  );
  for (const slug of VIRTUAL_MODEL_SLUGS) {
    assert.equal(typeof VIRTUAL_MODEL_LABELS[slug], "string");
  }
});

test("vote models exclude ECMWF and name the tiebreak model", () => {
  assert.deepEqual(GUINCHO_VOTE_MODELS, ["icon-eu", "icon-global", "gfs-global"]);
  assert.equal(ROUTER_TIEBREAK_MODEL, "icon-eu");
});
