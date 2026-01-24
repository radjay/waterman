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

        {/* Form or Success Message */}
        {showSent ? (
          <MagicLinkSent email={email} onBack={handleBack} />
        ) : (
          <EmailLoginForm onSuccess={handleSuccess} />
        )}
      </div>
    </div>
  );
}
