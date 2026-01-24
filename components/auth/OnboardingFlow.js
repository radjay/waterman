"use client";

import { useState, useEffect } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { useAuth } from "./AuthProvider";
import { Loader2, CheckCircle } from "lucide-react";

export default function OnboardingFlow({ onComplete }) {
  const { sessionToken, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Form data
  const [favoriteSports, setFavoriteSports] = useState([]);
  const [favoriteSpots, setFavoriteSpots] = useState([]);
  const [name, setName] = useState("");
  
  // Available sports
  const sports = ["wingfoil", "surfing"];
  
  // Spots data (will be fetched from API in real implementation)
  const [spots, setSpots] = useState([]);
  const [spotsLoading, setSpotsLoading] = useState(false);
  
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

  // Load spots when reaching step 3
  useEffect(() => {
    if (step === 3 && spots.length === 0) {
      loadSpots();
    }
  }, [step]);

  const loadSpots = async () => {
    setSpotsLoading(true);
    try {
      const spotsData = await client.query(api.spots.list, {});
      setSpots(spotsData);
    } catch (err) {
      console.error("Error loading spots:", err);
    } finally {
      setSpotsLoading(false);
    }
  };

  const toggleSport = (sport) => {
    setFavoriteSports((prev) =>
      prev.includes(sport)
        ? prev.filter((s) => s !== sport)
        : [...prev, sport]
    );
  };

  const toggleSpot = (spotId) => {
    setFavoriteSpots((prev) =>
      prev.includes(spotId)
        ? prev.filter((id) => id !== spotId)
        : [...prev, spotId]
    );
  };

  const handleNext = () => {
    // Validation
    if (step === 2 && favoriteSports.length === 0) {
      setError("Please select at least one sport");
      return;
    }
    
    setError("");
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError("");
    setStep((prev) => prev - 1);
  };

  const handleSkip = () => {
    setError("");
    setStep((prev) => prev + 1);
  };

  const handleComplete = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await client.mutation(api.auth.completeOnboarding, {
        sessionToken,
        favoriteSpots,
        favoriteSports: favoriteSports.length > 0 ? favoriteSports : ["wingfoil"],
        name: name.trim() || undefined,
      });

      if (result.success) {
        // Refresh user data
        await refreshUser();
        onComplete();
      } else {
        setError("Failed to save preferences. Please try again.");
      }
    } catch (err) {
      console.error("Error completing onboarding:", err);
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex gap-2 mb-3">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                s <= step ? "bg-ink" : "bg-ink/20"
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-ink/60 text-center">
          {step} of 4
        </p>
      </div>

      {/* Step 1: Welcome */}
      {step === 1 && (
        <div className="space-y-8 text-center">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-ink">Welcome to Waterman</h2>
            <p className="text-ink/70">
              Let's personalize your experience
            </p>
          </div>

          <button
            onClick={handleNext}
            className="w-full bg-ink text-newsprint py-3 px-4 rounded-md hover:bg-ink/90 transition-colors font-medium"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2: Select Favorite Sports */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-semibold text-ink">What sports do you love?</h2>
            <p className="text-ink/60">
              Select at least one
            </p>
          </div>

          <div className="space-y-2">
            {sports.map((sport) => (
              <button
                key={sport}
                onClick={() => toggleSport(sport)}
                className={`w-full p-4 rounded-md border-2 transition-all text-left ${
                  favoriteSports.includes(sport)
                    ? "border-ink bg-ink/5"
                    : "border-ink/20 hover:border-ink/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink capitalize">
                    {sport}
                  </span>
                  {favoriteSports.includes(sport) && (
                    <CheckCircle className="w-5 h-5 text-ink" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="flex-1 border-2 border-ink/20 text-ink py-3 px-4 rounded-md hover:border-ink/30 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              className="flex-1 bg-ink text-newsprint py-3 px-4 rounded-md hover:bg-ink/90 transition-colors font-medium"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Select Favorite Spots */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-semibold text-ink">Favorite spots?</h2>
            <p className="text-ink/60">
              Optional
            </p>
          </div>

          {spotsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-ink/60 animate-spin" />
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2 border-2 border-ink/20 rounded-md p-3">
              {spots.map((spot) => (
                <button
                  key={spot._id}
                  onClick={() => toggleSpot(spot._id)}
                  className={`w-full p-3 rounded-md border-2 transition-all text-left ${
                    favoriteSpots.includes(spot._id)
                      ? "border-ink bg-ink/5"
                      : "border-ink/20 hover:border-ink/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink">{spot.name}</p>
                      {spot.country && (
                        <p className="text-sm text-ink/60">{spot.country}</p>
                      )}
                    </div>
                    {favoriteSpots.includes(spot._id) && (
                      <CheckCircle className="w-5 h-5 text-ink" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="flex-1 border-2 border-ink/20 text-ink py-3 px-4 rounded-md hover:border-ink/30 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSkip}
              className="flex-1 border-2 border-ink/20 text-ink py-3 px-4 rounded-md hover:border-ink/30 transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              disabled={spotsLoading}
              className="flex-1 bg-ink text-newsprint py-3 px-4 rounded-md hover:bg-ink/90 transition-colors font-medium disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Name (Optional) */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-semibold text-ink">What's your name?</h2>
            <p className="text-ink/60">
              Optional
            </p>
          </div>

          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              disabled={loading}
              className="w-full px-4 py-3 bg-white border-2 border-ink/20 rounded-md focus:outline-none focus:border-ink text-ink placeholder:text-ink/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleComplete}
              disabled={loading}
              className="w-full bg-ink text-newsprint py-3 px-4 rounded-md hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Finishing up...
                </span>
              ) : (
                "Get Started"
              )}
            </button>
            
            <button
              onClick={handleBack}
              disabled={loading}
              className="w-full border-2 border-ink/20 text-ink py-3 px-4 rounded-md hover:border-ink/30 transition-colors disabled:opacity-50"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
