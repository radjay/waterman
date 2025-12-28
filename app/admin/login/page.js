"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { useAction } from "convex/react";
import { ConvexHttpClient } from "convex/browser";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
      const result = await client.action(api.admin.authenticate, { password });

      if (result.sessionToken) {
        // Store session token in localStorage (for V1, in production use HTTP-only cookies)
        localStorage.setItem("admin_session_token", result.sessionToken);
        router.push("/admin");
      }
    } catch (err) {
      setError(err.message || "Invalid password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-newsprint">
      <div className="w-full max-w-md p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-ink/30 rounded-md focus:outline-none focus:ring-2 focus:ring-ink/50"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-white py-2 px-4 rounded-md hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

