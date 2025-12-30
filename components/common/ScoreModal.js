"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

export function ScoreModal({ isOpen, onClose, score, slot, spotName }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !score) return null;

  const factors = score.factors || {};

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative bg-newsprint rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 border border-ink/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink hover:text-ink/60 transition-colors"
          aria-label="Close score report"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="font-headline text-2xl font-bold text-ink mb-2">
            Condition Score Report
          </h2>
          <div className="text-sm text-ink/60">
            {spotName} • {slot.hour}
          </div>
        </div>

        {/* Score */}
        <div className="mb-6 text-center">
          <div className="font-headline text-6xl font-bold text-ink mb-2">
            {score.value}
          </div>
          <div className="text-sm text-ink/60">out of 100</div>
        </div>

        {/* Reasoning */}
        <div className="mb-6">
          <h3 className="font-headline text-lg font-bold text-ink mb-2">
            Reasoning
          </h3>
          <p className="font-body text-ink leading-relaxed">
            {score.reasoning}
          </p>
        </div>

        {/* Factors */}
        {Object.keys(factors).length > 0 && (
          <div>
            <h3 className="font-headline text-lg font-bold text-ink mb-3">
              Factor Breakdown
            </h3>
            <div className="space-y-2">
              {factors.windQuality !== undefined && (
                <div className="flex items-center justify-between py-2 border-b border-ink/10">
                  <span className="font-body text-ink">Wind Quality</span>
                  <span className="font-headline font-bold text-ink">
                    {factors.windQuality}
                  </span>
                </div>
              )}
              {factors.waveQuality !== undefined && (
                <div className="flex items-center justify-between py-2 border-b border-ink/10">
                  <span className="font-body text-ink">Wave Quality</span>
                  <span className="font-headline font-bold text-ink">
                    {factors.waveQuality}
                  </span>
                </div>
              )}
              {factors.tideQuality !== undefined && (
                <div className="flex items-center justify-between py-2 border-b border-ink/10">
                  <span className="font-body text-ink">Tide Quality</span>
                  <span className="font-headline font-bold text-ink">
                    {factors.tideQuality}
                  </span>
                </div>
              )}
              {factors.overallConditions !== undefined && (
                <div className="flex items-center justify-between py-2 border-b border-ink/10">
                  <span className="font-body text-ink">Overall Conditions</span>
                  <span className="font-headline font-bold text-ink">
                    {factors.overallConditions}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


