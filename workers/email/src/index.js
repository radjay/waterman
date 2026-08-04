const FROM = {
  email: "waterman@radx.dev",
  name: "Waterman",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(body), { ...init, headers });
}

function validateMessage(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "Expected a JSON object";
  }

  if (typeof value.to !== "string" || !EMAIL_PATTERN.test(value.to)) {
    return "A valid recipient address is required";
  }

  if (typeof value.subject !== "string" || value.subject.trim() === "") {
    return "A subject is required";
  }

  if (value.html !== undefined && typeof value.html !== "string") {
    return "html must be a string";
  }

  if (value.text !== undefined && typeof value.text !== "string") {
    return "text must be a string";
  }

  if (!value.html && !value.text) {
    return "html or text content is required";
  }

  return null;
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return json(
        { success: false, error: "Method not allowed" },
        { status: 405, headers: { Allow: "POST" } }
      );
    }

    if (!env.EMAIL_WORKER_SECRET) {
      console.error("EMAIL_WORKER_SECRET is not configured");
      return json(
        { success: false, error: "Email service is not configured" },
        { status: 500 }
      );
    }

    if (request.headers.get("Authorization") !== `Bearer ${env.EMAIL_WORKER_SECRET}`) {
      return json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let message;
    try {
      message = await request.json();
    } catch {
      return json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const validationError = validateMessage(message);
    if (validationError) {
      return json({ success: false, error: validationError }, { status: 400 });
    }

    try {
      const result = await env.EMAIL.send({
        to: message.to,
        from: FROM,
        subject: message.subject,
        ...(message.html ? { html: message.html } : {}),
        ...(message.text ? { text: message.text } : {}),
      });

      return json({ success: true, messageId: result.messageId });
    } catch (error) {
      console.error("Cloudflare Email Service send failed", {
        code: error?.code,
        message: error instanceof Error ? error.message : String(error),
      });

      return json(
        {
          success: false,
          error: "Email delivery failed",
          ...(error?.code ? { code: error.code } : {}),
        },
        { status: 502 }
      );
    }
  },
};
