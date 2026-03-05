"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "../../../components/auth/AuthProvider";
import VerifyingMagicLink from "../../../components/auth/VerifyingMagicLink";
import OnboardingFlow from "../../../components/auth/OnboardingFlow";
import { XCircle } from "lucide-react";
import { Heading } from "../../../components/ui/Heading";
import { Text } from "../../../components/ui/Text";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const verifyMagicLink = useMutation(api.auth.verifyMagicLink);
  
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
      // Verify the magic link
      const result = await verifyMagicLink({
        token,
      });

      if (result.success && result.sessionToken) {
        // Login with the session token and check if it succeeded
        const loginResult = await login(result.sessionToken);
        
        if (!loginResult.success) {
          setStatus("error");
          setError(loginResult.error || "Failed to complete sign in. Please try again.");
          return;
        }
        
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
        <Card variant="elevated" className="bg-white p-8">
          <VerifyingMagicLink />
        </Card>
      )}

      {status === "success" && (
        <Card variant="elevated" className="bg-white p-8 text-center">
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
          <Heading level={2} className="text-2xl mb-2">
            Successfully signed in!
          </Heading>
          <Text variant="muted">Redirecting you to the app...</Text>
        </Card>
      )}

      {status === "onboarding" && (
        <Card variant="elevated" className="bg-white p-8">
          <OnboardingFlow onComplete={handleOnboardingComplete} />
        </Card>
      )}

      {status === "error" && (
        <Card variant="elevated" className="bg-white p-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <XCircle className="w-16 h-16 text-red-600" />
            </div>

            <div className="space-y-2">
              <Heading level={2} className="text-2xl">
                Verification Failed
              </Heading>
              <Text className="text-red-600">{error}</Text>
            </div>

            <div className="space-y-3">
              <Text variant="muted" className="text-sm">
                This magic link may have expired or already been used.
              </Text>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => router.push("/auth/login")}
              >
                Request a New Magic Link
              </Button>

              <Button
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => router.push("/")}
              >
                Go to Home
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-newsprint px-4">
      <div className="w-full max-w-3xl">
        <Suspense fallback={
          <Card variant="elevated" className="bg-white p-8">
            <VerifyingMagicLink />
          </Card>
        }>
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
