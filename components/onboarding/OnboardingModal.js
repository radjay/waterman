"use client";

import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

const SPORTS = [
  { id: "wingfoil", name: "Wingfoiling", emoji: "🪁" },
  { id: "kitesurfing", name: "Kitesurfing", emoji: "🪂" },
  { id: "surfing", name: "Surfing", emoji: "🏄" },
];

export function OnboardingModal({ onComplete, onDismiss, isDismissible = true }) {
  const [step, setStep] = useState(1);
  const [selectedSports, setSelectedSports] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [countries, setCountries] = useState([]);
  const [spots, setSpots] = useState([]);
  const [selectedSpots, setSelectedSpots] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch countries on mount
  useEffect(() => {
    async function fetchCountries() {
      try {
        const allSpots = await client.query(api.spots.list, {});
        const uniqueCountries = [...new Set(
          allSpots
            .map(spot => spot.country)
            .filter(country => country && country.trim())
        )].sort();
        setCountries(uniqueCountries);
      } catch (error) {
        console.error("Error fetching countries:", error);
      }
    }
    fetchCountries();
  }, []);

  // Fetch spots when country and sports are selected
  useEffect(() => {
    if (selectedCountry && selectedSports.length > 0) {
      async function fetchSpots() {
        setLoading(true);
        try {
          const allSpots = await client.query(api.spots.list, {
            sports: selectedSports,
          });
          const filteredSpots = allSpots.filter(
            spot => spot.country === selectedCountry
          );
          setSpots(filteredSpots);
        } catch (error) {
          console.error("Error fetching spots:", error);
        } finally {
          setLoading(false);
        }
      }
      fetchSpots();
    }
  }, [selectedCountry, selectedSports]);

  const handleSportToggle = (sportId) => {
    setSelectedSports(prev =>
      prev.includes(sportId)
        ? prev.filter(id => id !== sportId)
        : [...prev, sportId]
    );
  };

  const handleSpotToggle = (spotId) => {
    setSelectedSpots(prev =>
      prev.includes(spotId)
        ? prev.filter(id => id !== spotId)
        : [...prev, spotId]
    );
  };

  const handleNext = () => {
    if (step === 1 && selectedSports.length > 0) {
      setStep(2);
    } else if (step === 2 && selectedCountry) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleComplete = () => {
    // Save to localStorage
    const preferences = {
      sports: selectedSports,
      country: selectedCountry,
      favoriteSpots: selectedSpots,
      onboardingCompleted: true,
      completedAt: Date.now(),
    };
    localStorage.setItem("waterman_preferences", JSON.stringify(preferences));
    onComplete(preferences);
  };

  const handleSkip = () => {
    // Mark as completed but with no preferences
    const preferences = {
      onboardingCompleted: true,
      skipped: true,
      completedAt: Date.now(),
    };
    localStorage.setItem("waterman_preferences", JSON.stringify(preferences));
    if (onDismiss) {
      onDismiss();
    } else {
      onComplete(preferences);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-newsprint border-4 border-ink shadow-2xl">
        {/* Close button (only if dismissible) */}
        {isDismissible && (
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 hover:bg-ink/5 rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        {/* Content */}
        <div className="p-8 md:p-12">
          {/* Step 1: Select Sports */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-black text-ink mb-2">Welcome to Waterman</h1>
                <p className="text-lg text-ink/70">
                  Let's personalize your forecast experience
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-bold uppercase text-ink">
                  What sports do you practice?
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {SPORTS.map(sport => (
                    <button
                      key={sport.id}
                      onClick={() => handleSportToggle(sport.id)}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        selectedSports.includes(sport.id)
                          ? "border-ink bg-ink text-newsprint"
                          : "border-ink/30 hover:border-ink/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{sport.emoji}</span>
                          <span className="font-bold">{sport.name}</span>
                        </div>
                        {selectedSports.includes(sport.id) && (
                          <Check className="w-5 h-5" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleNext}
                  disabled={selectedSports.length === 0}
                  className="flex-1 px-6 py-3 bg-ink text-newsprint font-bold uppercase rounded-lg hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
                {isDismissible && (
                  <button
                    onClick={handleSkip}
                    className="px-6 py-3 border-2 border-ink/30 text-ink font-bold uppercase rounded-lg hover:border-ink/50 transition-colors"
                  >
                    Skip
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Select Country */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-black text-ink mb-2">Where do you ride?</h2>
                <p className="text-lg text-ink/70">
                  Select your country to see local spots
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-bold uppercase text-ink">
                  Country
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-ink/30 rounded-lg font-medium focus:border-ink focus:outline-none"
                >
                  <option value="">Select a country</option>
                  {countries.map(country => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 border-2 border-ink/30 text-ink font-bold uppercase rounded-lg hover:border-ink/50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!selectedCountry}
                  className="flex-1 px-6 py-3 bg-ink text-newsprint font-bold uppercase rounded-lg hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Select Favorite Spots */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-black text-ink mb-2">Pick your favorite spots</h2>
                <p className="text-lg text-ink/70">
                  We'll prioritize forecasts for these locations
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-bold uppercase text-ink">
                  Favorite Spots {selectedSpots.length > 0 && `(${selectedSpots.length} selected)`}
                </label>
                {loading ? (
                  <div className="text-center py-8 text-ink/60">Loading spots...</div>
                ) : spots.length === 0 ? (
                  <div className="text-center py-8 text-ink/60">
                    No spots found for {selectedCountry}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                    {spots.map(spot => (
                      <button
                        key={spot._id}
                        onClick={() => handleSpotToggle(spot._id)}
                        className={`p-3 border-2 rounded text-left transition-all ${
                          selectedSpots.includes(spot._id)
                            ? "border-ink bg-ink/5"
                            : "border-ink/20 hover:border-ink/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold">{spot.name}</div>
                            {spot.town && (
                              <div className="text-sm text-ink/60">{spot.town}</div>
                            )}
                          </div>
                          {selectedSpots.includes(spot._id) && (
                            <Check className="w-5 h-5" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 border-2 border-ink/30 text-ink font-bold uppercase rounded-lg hover:border-ink/50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 px-6 py-3 bg-ink text-newsprint font-bold uppercase rounded-lg hover:bg-ink/90 transition-colors"
                >
                  {selectedSpots.length > 0 ? "Continue" : "Skip for now"}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Account Creation Promotion */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-black text-ink mb-2">You're all set!</h2>
                <p className="text-lg text-ink/70">
                  Your preferences have been saved locally
                </p>
              </div>

              <div className="p-6 border-2 border-ink/20 rounded-lg bg-ink/5">
                <h3 className="text-xl font-bold text-ink mb-2">Create an account?</h3>
                <p className="text-ink/70 mb-4">
                  Save your preferences across devices and get personalized condition scores
                  based on your skill level and riding style.
                </p>
                <ul className="space-y-2 text-sm text-ink/70">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Personalized forecast scores</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Calendar subscriptions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Session logging</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleComplete}
                  className="flex-1 px-6 py-3 border-2 border-ink/30 text-ink font-bold uppercase rounded-lg hover:border-ink/50 transition-colors"
                >
                  Maybe Later
                </button>
                <button
                  onClick={() => {
                    handleComplete();
                    window.location.href = "/auth/login";
                  }}
                  className="flex-1 px-6 py-3 bg-ink text-newsprint font-bold uppercase rounded-lg hover:bg-ink/90 transition-colors"
                >
                  Create Account
                </button>
              </div>
            </div>
          )}

          {/* Progress indicator */}
          <div className="mt-8 flex items-center justify-center gap-2">
            {[1, 2, 3, 4].map(num => (
              <div
                key={num}
                className={`h-2 rounded-full transition-all ${
                  num === step
                    ? "w-8 bg-ink"
                    : num < step
                    ? "w-2 bg-ink/50"
                    : "w-2 bg-ink/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
