import assert from "node:assert/strict";
import test from "node:test";

import worker from "../../workers/email/src/index.js";

const URL = "https://email.example.test/";
const SECRET = "test-secret";

function request(body, options = {}) {
  return new Request(URL, {
    method: options.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.authorized === false
        ? {}
        : { Authorization: `Bearer ${SECRET}` }),
    },
    body: options.method === "GET" ? undefined : JSON.stringify(body),
  });
}

test("rejects unauthenticated requests without calling the email binding", async () => {
  let sends = 0;
  const response = await worker.fetch(request({}, { authorized: false }), {
    EMAIL_WORKER_SECRET: SECRET,
    EMAIL: { send: async () => sends++ },
  });

  assert.equal(response.status, 401);
  assert.equal(sends, 0);
  assert.deepEqual(await response.json(), { success: false, error: "Unauthorized" });
});

test("validates the email payload", async () => {
  const response = await worker.fetch(
    request({ to: "not-an-email", subject: "Sign in", text: "Hello" }),
    {
      EMAIL_WORKER_SECRET: SECRET,
      EMAIL: { send: async () => assert.fail("send should not be called") },
    }
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    success: false,
    error: "A valid recipient address is required",
  });
});

test("sends through the binding with a fixed verified sender", async () => {
  let sentMessage;
  const response = await worker.fetch(
    request({
      to: "sailor@example.com",
      subject: "Sign in to Waterman",
      html: "<p>Hello</p>",
      text: "Hello",
    }),
    {
      EMAIL_WORKER_SECRET: SECRET,
      EMAIL: {
        send: async (message) => {
          sentMessage = message;
          return { messageId: "email-123" };
        },
      },
    }
  );

  assert.equal(response.status, 200);
  assert.deepEqual(sentMessage, {
    to: "sailor@example.com",
    from: { email: "waterman@radx.dev", name: "Waterman" },
    subject: "Sign in to Waterman",
    html: "<p>Hello</p>",
    text: "Hello",
  });
  assert.deepEqual(await response.json(), {
    success: true,
    messageId: "email-123",
  });
});

test("returns a stable gateway error when Cloudflare rejects the message", async () => {
  const cloudflareError = new Error("recipient suppressed");
  cloudflareError.code = "E_RECIPIENT_SUPPRESSED";

  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    const response = await worker.fetch(
      request({ to: "sailor@example.com", subject: "Sign in", text: "Hello" }),
      {
        EMAIL_WORKER_SECRET: SECRET,
        EMAIL: { send: async () => Promise.reject(cloudflareError) },
      }
    );

    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
      success: false,
      error: "Email delivery failed",
      code: "E_RECIPIENT_SUPPRESSED",
    });
  } finally {
    console.error = originalConsoleError;
  }
});
