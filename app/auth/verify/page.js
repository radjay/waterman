"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "../../../components/auth/AuthProvider";
import VerifyingMagicLink from "../../../components/auth/VerifyingMagicLink";
import OnboardingFlow from "../../../components/auth/OnboardingFlow";
import { XCircle } from "lucide-react";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  
  const [status, setStatus] = useState("verifying"); // verifying, success, onboarding, error
  const [error, setError] = useState("");
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    
    if (!token) {
      setStatus("error");
      setError("Invalid magic link - no token provided");
      return;
    }

    verifyToken(token);
  }, [searchParams]);

  const verifyToken = async (token) => {
    try {
      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
      
      // Verify the magic link
      const result = await client.mutation(api.auth.verifyMagicLink, {
        token,
      });

      if (result.success && result.sessionToken) {
        // Login with the session token
        await login(result.sessionToken);
        
        // Check if needs onboarding
        if (result.needsOnboarding) {
          setNeedsOnboarding(true);
          setStatus("onboarding");
        } else {
          setStatus("success");
          // Redirect to home after a brief moment
          setTimeout(() => {
            router.push("/");
          }, 1000);
        }
      } else {
        setStatus("error");
        setError(result.error || "Failed to verify magic link");
      }
    } catch (err) {
      console.error("Error verifying magic link:", err);
      setStatus("error");
      setError(err.message || "An error occurred during verification");
    }
  };

  const handleOnboardingComplete = () => {
    router.push("/");
  };

  return (
    <>
      {status === "verifying" && (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <VerifyingMagicLink />
        </div>
      )}

      {status === "success" && (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-green-600 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-ink mb-2">
            Successfully signed in!
          </h2>
          <p className="text-ink/70">Redirecting you to the app...</p>
        </div>
      )}

      {status === "onboarding" && (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <OnboardingFlow onComplete={handleOnboardingComplete} />
        </div>
      )}

      {status === "error" && (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <XCircle className="w-16 h-16 text-red-600" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-ink">
                Verification Failed
              </h2>
              <p className="text-red-600">{error}</p>
            </div>

            <div className="space-y-3">
              <p className="text-ink/70 text-sm">
                This magic link may have expired or already been used.
              </p>

              <button
                onClick={() => router.push("/auth/login")}
                className="w-full bg-ink text-newsprint py-3 px-6 rounded-md hover:bg-ink/90 transition-colors font-medium"
              >
                Request a New Magic Link
              </button>

              <button
                onClick={() => router.push("/")}
                className="w-full border border-ink/30 text-ink py-3 px-6 rounded-md hover:bg-ink/5 transition-colors font-medium"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-newsprint px-4">
      <div className="w-full max-w-3xl">
        <Suspense fallback={
          <div className="bg-white rounded-lg shadow-lg p-8">
            <VerifyingMagicLink />
          </div>
        }>
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
