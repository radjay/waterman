"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../components/auth/AuthProvider";
import EmailLoginForm from "../../../components/auth/EmailLoginForm";
import MagicLinkSent from "../../../components/auth/MagicLinkSent";

export default function LoginPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [showSent, setShowSent] = useState(false);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-newsprint">
        <div className="text-ink">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-newsprint px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-ink mb-2">
              {showSent ? "Check Your Email" : "Welcome to Waterman"}
            </h1>
            {!showSent && (
              <p className="text-ink/60">
                Sign in to save your preferences and get personalized forecasts
              </p>
            )}
          </div>

          {/* Form or Success Message */}
          {showSent ? (
            <MagicLinkSent email={email} onBack={handleBack} />
          ) : (
            <EmailLoginForm onSuccess={handleSuccess} />
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-ink/50 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
