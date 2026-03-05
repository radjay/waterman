"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { SportBadge } from "../ui/SportBadge";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Heading } from "../ui/Heading";
import { Text } from "../ui/Text";
import { Divider } from "../ui/Divider";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

const SPORTS = [
  { id: "wingfoil", name: "Wingfoiling" },
  { id: "kitesurfing", name: "Kitesurfing" },
  { id: "surfing", name: "Surfing" },
];

export function OnboardingModal({ onComplete, onDismiss, isDismissible = true }) {
  const [step, setStep] = useState(1);
  const [selectedSports, setSelectedSports] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [countries, setCountries] = useState([]);
  const [spots, setSpots] = useState([]);
  const [selectedSpots, setSelectedSpots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchCountries() {
      try {
        const allSpots = await client.query(api.spots.list, {});
        const uniqueCountries = [...new Set(
          allSpots.map(spot => spot.country).filter(c => c && c.trim())
        )].sort();
        setCountries(uniqueCountries);
      } catch (error) {
        console.error("Error fetching countries:", error);
      }
    }
    fetchCountries();
  }, []);

  useEffect(() => {
    if (selectedCountry && selectedSports.length > 0) {
      async function fetchSpots() {
        setLoading(true);
        try {
          const allSpots = await client.query(api.spots.list, { sports: selectedSports });
          setSpots(allSpots.filter(spot => spot.country === selectedCountry));
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
      prev.includes(sportId) ? prev.filter(id => id !== sportId) : [...prev, sportId]
    );
  };

  const handleSpotToggle = (spotId) => {
    setSelectedSpots(prev =>
      prev.includes(spotId) ? prev.filter(id => id !== spotId) : [...prev, spotId]
    );
  };

  const handleNext = () => {
    if (step === 1 && selectedSports.length > 0) setStep(2);
    else if (step === 2 && selectedCountry) setStep(3);
    else if (step === 3) setStep(4);
  };

  const handleComplete = () => {
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
    const preferences = { onboardingCompleted: true, skipped: true, completedAt: Date.now() };
    localStorage.setItem("waterman_preferences", JSON.stringify(preferences));
    if (onDismiss) onDismiss();
    else onComplete(preferences);
  };

  return (
    <Modal isOpen onClose={isDismissible ? handleSkip : undefined} size="sm">
      <div className="p-7">

        {/* Step 1: Select Sports */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-headline text-2xl font-bold text-ink tracking-tight">Welcome to Waterman</h2>
              <Text variant="muted" className="mt-1">Which sports do you practice?</Text>
            </div>

            <div className="space-y-2">
              {SPORTS.map(sport => {
                const selected = selectedSports.includes(sport.id);
                return (
                  <button
                    key={sport.id}
                    onClick={() => handleSportToggle(sport.id)}
                    className={`w-full px-4 py-3 border rounded-ui text-left transition-all duration-fast flex items-center justify-between group ${
                      selected
                        ? "border-ink/40 bg-warm-highlight"
                        : "border-ink/10 hover:border-ink/25 hover:bg-warm-highlight/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <SportBadge sport={sport.id} size={28} className={selected ? "text-ink/60" : "text-ink/30 group-hover:text-ink/50"} />
                      <Text className="font-medium">{sport.name}</Text>
                    </div>
                    {selected && <Check className="w-4 h-4 text-ink/50 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={selectedSports.length === 0}
                fullWidth
              >
                Continue
              </Button>
              {isDismissible && (
                <Button variant="ghost" onClick={handleSkip}>Skip</Button>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Select Country */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <Heading level={3}>Where do you ride?</Heading>
              <Text variant="muted" className="mt-1">Select your country to see local spots.</Text>
            </div>

            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full px-3 py-2.5 border border-ink/15 rounded-ui text-sm font-medium bg-newsprint focus:border-ink/40 focus:outline-none transition-colors"
            >
              <option value="">Select a country</option>
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>

            <div className="flex items-center gap-2 pt-1">
              <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={!selectedCountry}
                fullWidth
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Favorite Spots */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <Heading level={3}>Your favorite spots</Heading>
              <Text variant="muted" className="mt-1">
                We'll prioritize forecasts for these.{selectedSpots.length > 0 && ` (${selectedSpots.length} selected)`}
              </Text>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5">
              {loading ? (
                <Text variant="muted" className="py-6 text-center">Loading spots…</Text>
              ) : spots.length === 0 ? (
                <Text variant="muted" className="py-6 text-center">No spots found for {selectedCountry}.</Text>
              ) : spots.map(spot => {
                const selected = selectedSpots.includes(spot._id);
                return (
                  <button
                    key={spot._id}
                    onClick={() => handleSpotToggle(spot._id)}
                    className={`w-full px-4 py-2.5 border rounded-ui text-left transition-all duration-fast flex items-center justify-between ${
                      selected
                        ? "border-ink/40 bg-warm-highlight"
                        : "border-ink/10 hover:border-ink/25 hover:bg-warm-highlight/50"
                    }`}
                  >
                    <div>
                      <Text className="font-medium">{spot.name}</Text>
                      {spot.town && <Text variant="caption">{spot.town}</Text>}
                    </div>
                    {selected && <Check className="w-4 h-4 text-ink/50 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            <Divider weight="light" />
            <Text variant="caption" className="text-center">
              Don't see your spot?{" "}
              <a href="/request-spot" className="underline decoration-dotted underline-offset-2 hover:text-ink transition-colors" target="_blank" rel="noopener noreferrer">
                Request it here
              </a>
            </Text>

            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
              <Button variant="primary" onClick={handleNext} fullWidth>
                {selectedSpots.length > 0 ? "Continue" : "Skip for now"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Account Prompt */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <Heading level={3}>You're all set</Heading>
              <Text variant="muted" className="mt-1">Preferences saved locally.</Text>
            </div>

            <div className="space-y-2 py-1">
              {["Personalized forecast scores", "Calendar subscriptions", "Session logging"].map(item => (
                <div key={item} className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-ink/40 flex-shrink-0" />
                  <Text variant="muted">{item}</Text>
                </div>
              ))}
            </div>

            <Text variant="caption" className="text-center">
              Create an account to sync preferences across devices.
            </Text>

            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleComplete} fullWidth>Maybe later</Button>
              <Button
                variant="primary"
                onClick={() => { handleComplete(); window.location.href = "/auth/login"; }}
                fullWidth
              >
                Create account
              </Button>
            </div>
          </div>
        )}

        {/* Progress dots */}
        <div className="mt-6 flex items-center justify-center gap-1.5">
          {[1, 2, 3, 4].map(num => (
            <div
              key={num}
              className={`rounded-full transition-all duration-base ${
                num === step ? "w-5 h-1.5 bg-ink/50" : num < step ? "w-1.5 h-1.5 bg-ink/30" : "w-1.5 h-1.5 bg-ink/15"
              }`}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}
