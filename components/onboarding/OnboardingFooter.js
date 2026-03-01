"use client";

import { useState } from "react";
import { Settings, X } from "lucide-react";
import { OnboardingModal } from "./OnboardingModal";

export function OnboardingFooter({ onDismiss }) {
  const [showModal, setShowModal] = useState(false);

  const handleComplete = (preferences) => {
    setShowModal(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleDismissFooter = () => {
    // Mark footer as dismissed (but not onboarding as completed)
    localStorage.setItem("waterman_onboarding_footer_dismissed", "true");
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-ink text-newsprint border-t-4 border-newsprint">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Settings className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-sm md:text-base">Personalize your forecast</div>
              <div className="text-xs md:text-sm text-newsprint/80">
                Select your sports and favorite spots to get better recommendations
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-newsprint text-ink font-bold text-sm uppercase rounded hover:bg-newsprint/90 transition-colors whitespace-nowrap"
            >
              Get Started
            </button>
            <button
              onClick={handleDismissFooter}
              className="p-2 hover:bg-newsprint/10 rounded transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <OnboardingModal
          onComplete={handleComplete}
          onDismiss={() => setShowModal(false)}
          isDismissible={true}
        />
      )}
    </>
  );
}
