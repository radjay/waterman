"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../components/auth/AuthProvider";
import EmailLoginForm from "../../../components/auth/EmailLoginForm";
import MagicLinkSent from "../../../components/auth/MagicLinkSent";

export default function LoginPage() {
  const { isAuthenticated, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [showSent, setShowSent] = useState(false);
  const [mode, setMode] = useState("email"); // "email" or "token"
  const [sessionToken, setSessionToken] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [verifyingToken, setVerifyingToken] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, loading, router]);

  const handleSuccess = (submittedEmail) => {
    setEmail(submittedEmail);
    setShowSent(true);
  };

  const handleBack = () => {
    setShowSent(false);
    setEmail("");
  };

  const handleTokenSubmit = async (e) => {
    e.preventDefault();
    setTokenError("");
    
    if (!sessionToken.trim()) {
      setTokenError("Please enter a session token");
      return;
    }

    setVerifyingToken(true);

    try {
      // Try to login with the token
      await login(sessionToken.trim());
      router.push("/");
    } catch (err) {
      console.error("Token verification error:", err);
      setTokenError("Invalid or expired session token. Please request a new magic link.");
    } finally {
      setVerifyingToken(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-newsprint">
        <div className="text-ink">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-headline text-4xl font-bold text-ink mb-2">
            Waterman
          </h1>
          {!showSent && (
            <p className="text-ink/60 text-sm">
              Sign in to personalize your experience
            </p>
          )}
        </div>

        {/* Mode Toggle */}
        {!showSent && (
          <div className="flex gap-2 mb-6 bg-white rounded-lg p-1 border border-ink/10">
            <button
              onClick={() => setMode("email")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === "email"
                  ? "bg-ink text-newsprint"
                  : "text-ink/60 hover:text-ink"
              }`}
            >
              Email
            </button>
            <button
              onClick={() => setMode("token")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === "token"
                  ? "bg-ink text-newsprint"
                  : "text-ink/60 hover:text-ink"
              }`}
            >
              Session Token
            </button>
          </div>
        )}

        {/* Form or Success Message */}
        {showSent ? (
          <MagicLinkSent email={email} onBack={handleBack} />
        ) : mode === "email" ? (
          <EmailLoginForm onSuccess={handleSuccess} />
        ) : (
          <div className="bg-white rounded-lg border border-ink/10 p-8">
            <h2 className="text-xl font-semibold text-ink mb-2">
              Enter Session Token
            </h2>
            <p className="text-sm text-ink/60 mb-6">
              Paste the session token you received after clicking your magic link
            </p>

            <form onSubmit={handleTokenSubmit} className="space-y-4">
              <div>
                <textarea
                  value={sessionToken}
                  onChange={(e) => setSessionToken(e.target.value)}
                  placeholder="Paste your session token here..."
                  rows={4}
                  className="w-full px-4 py-3 border border-ink/20 rounded-md focus:outline-none focus:ring-2 focus:ring-ink/20 font-mono text-sm"
                  disabled={verifyingToken}
                />
              </div>

              {tokenError && (
                <p className="text-red-600 text-sm">{tokenError}</p>
              )}

              <button
                type="submit"
                disabled={verifyingToken}
                className="w-full bg-ink text-newsprint py-3 px-6 rounded-md hover:bg-ink/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifyingToken ? "Verifying..." : "Sign In"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
