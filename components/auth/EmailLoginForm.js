"use client";

import { useState } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

export default function EmailLoginForm({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await client.mutation(api.auth.requestMagicLink, {
        email: email.toLowerCase().trim(),
      });

      if (result.success) {
        onSuccess(email);
      } else {
        setError(result.message || "Failed to send magic link");
      }
    } catch (err) {
      console.error("Error requesting magic link:", err);
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium mb-2 text-ink"
        >
          Email Address
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoFocus
          disabled={loading}
          className="w-full px-4 py-3 border border-ink/30 rounded-md focus:outline-none focus:ring-2 focus:ring-ink/50 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-ink text-newsprint py-3 px-4 rounded-md hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {loading ? "Sending..." : "Send Magic Link"}
      </button>

      <p className="text-sm text-ink/60 text-center">
        We'll send you a magic link to sign in instantly — no password needed.
      </p>
    </form>
  );
}
