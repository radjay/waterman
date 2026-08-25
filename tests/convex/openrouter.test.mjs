import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  OPENROUTER_MODEL,
  OPENROUTER_URL,
  batchScoreJsonSchema,
  completeScoreJson,
  isOpenRouterRateLimit,
  openrouterApiKey,
  parseScorePayload,
} from "../../convex/openrouter.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

const originalKey = process.env.OPENROUTER_API_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalKey;
});

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

describe("parseScorePayload", () => {
  it("maps a JSON-object completion to the score shape", () => {
    const parsed = parseScorePayload({
      score: 74.4,
      reasoning: "  Cross-on, 18kt, go.  ",
      factors: { windQuality: 80 },
    });
    assert.deepEqual(parsed, {
      score: 74,
      reasoning: "Cross-on, 18kt, go.",
      factors: { windQuality: 80 },
    });
  });

  it("rejects a missing score", () => {
    assert.throws(
      () => parseScorePayload({ reasoning: "ok" }),
      /Invalid score/
    );
  });

  it("rejects empty reasoning", () => {
    assert.throws(
      () => parseScorePayload({ score: 50, reasoning: "   " }),
      /reasoning/
    );
  });
});

describe("completeScoreJson", () => {
  it("POSTs OpenRouter with json_schema and the Qwen instruct slug", async () => {
    process.env.OPENROUTER_API_KEY = "sk-test";
    let captured;
    const fetchImpl = async (url, init) => {
      captured = { url, init };
      return jsonResponse({
        model: OPENROUTER_MODEL,
        choices: [
          {
            message: {
              content: JSON.stringify({ score: 80, reasoning: "Solid." }),
            },
          },
        ],
      });
    };

    const result = await completeScoreJson({
      system: "sys",
      user: "usr",
      fetchImpl,
    });

    assert.equal(captured.url, OPENROUTER_URL);
    const body = JSON.parse(captured.init.body);
    assert.equal(body.model, OPENROUTER_MODEL);
    assert.equal(body.response_format.type, "json_schema");
    assert.equal(body.temperature, 0.3);
    assert.equal(result.parsed.score, 80);
    assert.equal(result.model, OPENROUTER_MODEL);
  });

  it("throws on HTTP 429 so callers can retry", async () => {
    process.env.OPENROUTER_API_KEY = "sk-test";
    const fetchImpl = async () => jsonResponse({ error: "rate limit" }, 429);
    await assert.rejects(
      () => completeScoreJson({ system: "s", user: "u", fetchImpl }),
      (err) => err.status === 429 && isOpenRouterRateLimit(err)
    );
  });

  it("throws when the API key is missing, without calling fetch", async () => {
    delete process.env.OPENROUTER_API_KEY;
    let called = 0;
    await assert.rejects(
      () =>
        completeScoreJson({
          system: "s",
          user: "u",
          fetchImpl: async () => {
            called += 1;
            throw new Error("should not fetch");
          },
        }),
      /OPENROUTER_API_KEY not set/
    );
    assert.equal(called, 0);
    assert.equal(openrouterApiKey(), "");
  });

  it("rejects model content that is not JSON", async () => {
    process.env.OPENROUTER_API_KEY = "sk-test";
    const fetchImpl = async () =>
      jsonResponse({
        choices: [{ message: { content: "not json" } }],
      });
    await assert.rejects(
      () => completeScoreJson({ system: "s", user: "u", fetchImpl }),
      /not JSON/
    );
  });

  it("builds a batch schema with a fixed scores length", () => {
    const schema = batchScoreJsonSchema(3);
    assert.equal(schema.schema.properties.scores.minItems, 3);
    assert.equal(schema.schema.properties.scores.maxItems, 3);
  });
});

describe("scoring call sites", () => {
  it("uses the shared helper from system and personalized scoring", () => {
    const spots = read("convex/spots.ts");
    const personal = read("convex/personalization.ts");
    assert.match(spots, /completeScoreJson/);
    assert.match(personal, /completeScoreJson/);
    assert.doesNotMatch(spots, /new Groq\(/);
    assert.doesNotMatch(personal, /new Groq\(/);
    assert.doesNotMatch(spots, /GROQ_API_KEY/);
    assert.doesNotMatch(personal, /GROQ_API_KEY/);
  });
});
