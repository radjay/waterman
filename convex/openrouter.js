/** Default scoring model: instruct-only, no chain-of-thought. */
export const OPENROUTER_MODEL = "qwen/qwen3-30b-a3b-instruct-2507";
export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const SCORE_TEMPERATURE = 0.3;
export const SCORE_MAX_TOKENS = 4000;

const SCORE_ITEM_PROPERTIES = {
  score: { type: "number", description: "Integer 0-100" },
  reasoning: { type: "string", description: "Short opinionated explanation" },
  factors: {
    type: "object",
    additionalProperties: false,
    properties: {
      windQuality: { type: "number" },
      waveQuality: { type: "number" },
      tideQuality: { type: "number" },
      overallConditions: { type: "number" },
    },
  },
};

export const SCORE_JSON_SCHEMA = {
  name: "condition_score",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: SCORE_ITEM_PROPERTIES,
    required: ["score", "reasoning"],
  },
};

export function batchScoreJsonSchema(slotCount) {
  return {
    name: "condition_scores_batch",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        scores: {
          type: "array",
          minItems: slotCount,
          maxItems: slotCount,
          items: {
            type: "object",
            additionalProperties: false,
            properties: SCORE_ITEM_PROPERTIES,
            required: ["score", "reasoning"],
          },
        },
      },
      required: ["scores"],
    },
  };
}

export function openrouterApiKey() {
  return process.env.OPENROUTER_API_KEY || "";
}

export function isOpenRouterRateLimit(error) {
  if (!error) return false;
  if (error.status === 429) return true;
  const message = String(error.message || "");
  return /rate limit/i.test(message) || message.includes("429");
}

export function parseScorePayload(parsed) {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Score payload is not an object");
  }
  if (typeof parsed.score !== "number" || parsed.score < 0 || parsed.score > 100) {
    throw new Error(`Invalid score: ${parsed.score}`);
  }
  if (typeof parsed.reasoning !== "string" || parsed.reasoning.trim().length === 0) {
    throw new Error("Missing or empty reasoning");
  }
  return {
    score: Math.round(parsed.score),
    reasoning: parsed.reasoning.trim(),
    factors: parsed.factors && typeof parsed.factors === "object" ? parsed.factors : undefined,
  };
}

/**
 * One chat-completions call. Callers own retries.
 * Throws if the key is missing, the HTTP call fails, or the body is not JSON.
 */
export async function completeScoreJson({
  system,
  user,
  maxTokens = SCORE_MAX_TOKENS,
  schema = SCORE_JSON_SCHEMA,
  fetchImpl = fetch,
} = {}) {
  const apiKey = openrouterApiKey();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not set");
  }

  const response = await fetchImpl(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer":
        process.env.NEXT_PUBLIC_APP_URL || "https://www.watermanreport.com",
      "X-Title": "Waterman",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: SCORE_TEMPERATURE,
      max_tokens: maxTokens,
      response_format: {
        type: "json_schema",
        json_schema: schema,
      },
    }),
  });

  const text = await response.text();
  if (response.status === 429) {
    const error = new Error(`OpenRouter 429: ${text.slice(0, 300)}`);
    error.status = 429;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(`OpenRouter ${response.status}: ${text.slice(0, 300)}`);
    error.status = response.status;
    throw error;
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("OpenRouter response was not JSON");
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("No content in response");
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Model content was not JSON");
  }

  return {
    content,
    parsed,
    model: typeof data.model === "string" && data.model ? data.model : OPENROUTER_MODEL,
  };
}
