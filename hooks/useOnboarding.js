"use client";

import { useState, useEffect } from "react";

export function useOnboarding(user = null) {
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [showFooter, setShowFooter] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Authenticated users never need onboarding (they have account preferences)
    if (user) {
      setNeedsOnboarding(false);
      setShowFooter(false);
      setIsLoading(false);
      return;
    }

    // Check if onboarding is completed
    const preferencesStr = localStorage.getItem("waterman_preferences");
    const footerDismissed = localStorage.getItem("waterman_onboarding_footer_dismissed");

    if (!preferencesStr) {
      // No preferences saved - needs onboarding
      setNeedsOnboarding(true);
      setShowFooter(!footerDismissed);
    } else {
      const preferences = JSON.parse(preferencesStr);
      if (!preferences.onboardingCompleted) {
        setNeedsOnboarding(true);
        setShowFooter(!footerDismissed);
      }
    }

    setIsLoading(false);
  }, [user]);

  const markOnboardingComplete = () => {
    setNeedsOnboarding(false);
    setShowFooter(false);
  };

  const dismissFooter = () => {
    setShowFooter(false);
  };

  return {
    needsOnboarding,
    showFooter,
    isLoading,
    markOnboardingComplete,
    dismissFooter,
  };
}
