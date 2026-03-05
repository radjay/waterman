"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../components/auth/AuthProvider";
import EmailLoginForm from "../../../components/auth/EmailLoginForm";
import MagicLinkSent from "../../../components/auth/MagicLinkSent";
import { Heading } from "../../../components/ui/Heading";
import { Text } from "../../../components/ui/Text";

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
          <Heading level={1} className="text-4xl mb-2">
            Waterman
          </Heading>
          {!showSent && (
            <Text variant="muted" className="text-sm">
              Sign in to personalize your experience
            </Text>
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
