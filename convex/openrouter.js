/** Default scoring model. Rubric JSON only; do not enable chain-of-thought. */
export const OPENROUTER_MODEL = "openai/gpt-5.6-luna";
export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const SCORE_TEMPERATURE = 0.3;
export const SCORE_MAX_TOKENS = 4000;
export const SCORE_REASONING = { effort: "none" };

const FACTOR_KEYS = ["windQuality", "waveQuality", "tideQuality", "overallConditions"];

const SCORE_ITEM_PROPERTIES = {
  score: { type: "number", description: "Integer 0-100" },
  reasoning: { type: "string", description: "Short opinionated explanation" },
  factors: {
    type: "object",
    additionalProperties: false,
    properties: Object.fromEntries(FACTOR_KEYS.map((key) => [key, { type: "number" }])),
    required: FACTOR_KEYS,
  },
};

const SCORE_ITEM_REQUIRED = ["score", "reasoning", "factors"];

export const SCORE_JSON_SCHEMA = {
  name: "condition_score",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: SCORE_ITEM_PROPERTIES,
    required: SCORE_ITEM_REQUIRED,
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
            required: SCORE_ITEM_REQUIRED,
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

function extractMessageContent(message) {
  const content = message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : part?.text || ""))
      .join("");
  }
  return "";
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
      reasoning: SCORE_REASONING,
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

  const content = extractMessageContent(data?.choices?.[0]?.message);
  if (!content) {
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
