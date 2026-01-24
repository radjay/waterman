"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "./AuthProvider";

export default function MagicLinkSent({ email, onBack }) {
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const verifyCode = useMutation(api.auth.verifyCode);
  const { login } = useAuth();
  const router = useRouter();

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!code.trim() || code.trim().length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setVerifying(true);

    try {
      const result = await verifyCode({ email, code: code.trim() });
      
      if (result.success && result.sessionToken) {
        await login(result.sessionToken);
        
        // Check if needs onboarding
        if (result.needsOnboarding) {
          router.push("/auth/verify?onboarding=true");
        } else {
          router.push("/");
        }
      } else {
        setError(result.error || "Invalid code. Please try again.");
      }
    } catch (err) {
      console.error("Code verification error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  if (showCodeInput) {
    return (
      <div className="bg-white rounded-lg border border-ink/10 p-8">
        <h2 className="text-xl font-semibold text-ink mb-2">Enter Code</h2>
        <p className="text-sm text-ink/60 mb-6">
          Enter the 6-digit code from your email
        </p>

        <form onSubmit={handleCodeSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              className="w-full px-4 py-3 border border-ink/20 rounded-md focus:outline-none focus:ring-2 focus:ring-ink/20 text-center text-2xl font-mono tracking-widest"
              disabled={verifying}
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={verifying || code.length !== 6}
            className="w-full bg-ink text-newsprint py-3 px-6 rounded-md hover:bg-ink/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifying ? "Verifying..." : "Sign In"}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowCodeInput(false);
              setCode("");
              setError("");
            }}
            className="w-full text-ink/60 text-sm hover:text-ink transition-colors"
          >
            Back to email sent
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <Mail className="w-16 h-16 text-ink/60" />
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-semibold text-ink">Check your email</h2>
        <p className="text-ink/70">
          We sent a sign-in link to<br />
          <span className="font-medium text-ink">{email}</span>
        </p>
      </div>

      <div className="text-sm text-ink/60 space-y-3">
        <p>
          <button
            onClick={() => setShowCodeInput(true)}
            className="text-ink underline hover:no-underline font-medium"
          >
            Enter code instead
          </button>
        </p>
        <p>Didn't receive it?{" "}
          <button
            onClick={onBack}
            className="text-ink underline hover:no-underline"
          >
            Try again
          </button>
        </p>
      </div>
    </div>
  );
}
