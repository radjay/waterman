"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { useAuth, useUser } from "../../../components/auth/AuthProvider";
import { MainLayout } from "../../../components/layout/MainLayout";
import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import { LocationPicker } from "../../../components/journal/LocationPicker";
import { RatingInput } from "../../../components/journal/RatingInput";
import { DurationInput } from "../../../components/journal/DurationInput";
import { ForecastComparison } from "../../../components/journal/ForecastComparison";
import { Loader2, ArrowLeft } from "lucide-react";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function NewJournalEntryPage() {
  const router = useRouter();
  const { sessionToken } = useAuth();
  const user = useUser();

  const [sport, setSport] = useState("wingfoil");
  const [location, setLocation] = useState(null);
  const [sessionDate, setSessionDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm format
  });
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [rating, setRating] = useState(0);
  const [sessionNotes, setSessionNotes] = useState("");
  const [conditionNotes, setConditionNotes] = useState("");
  const [forecastSlots, setForecastSlots] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Default to user's primary sport
  useEffect(() => {
    if (user?.favoriteSports && user.favoriteSports.length > 0) {
      setSport(user.favoriteSports[0]);
    }
  }, [user]);

  // Fetch forecast preview when location and time change
  useEffect(() => {
    if (!location || location.type !== "spot" || !location.spotId || !sessionDate) return;

    async function fetchForecast() {
      try {
        const sessionTime = new Date(sessionDate).getTime();
        const sessionEnd = sessionTime + (durationMinutes * 60 * 1000);
        const searchStart = sessionTime - (60 * 60 * 1000);

        // Get slots for this time window (searches across all scrapes)
        const matchingSlots = await client.query(api.journal.getForecastSlotsForTimeWindow, {
          spotId: location.spotId,
          startTime: searchStart,
          endTime: sessionEnd,
        });

        // Get scores for these slots (system scores only for preview)
        const allScores = await client.query(api.spots.getConditionScores, {
          spotId: location.spotId,
          sport,
        });
        
        // Match scores to slots by timestamp (within 1 hour tolerance)
        const slotsWithScores = matchingSlots.map((slot) => {
          // Find score by timestamp (closest match within 1 hour)
          const score = allScores.find(s => {
            const timeDiff = Math.abs(s.timestamp - slot.timestamp);
            return timeDiff < 60 * 60 * 1000; // Within 1 hour
          });
          
          return {
            _id: slot._id,
            timestamp: slot.timestamp,
            speed: slot.speed,
            gust: slot.gust,
            direction: slot.direction,
            waveHeight: slot.waveHeight,
            wavePeriod: slot.wavePeriod,
            waveDirection: slot.waveDirection,
            score: score ? {
              value: score.score,
              reasoning: score.reasoning,
            } : undefined,
          };
        });

        setForecastSlots(slotsWithScores);
      } catch (err) {
        console.error("Error fetching forecast:", err);
        setForecastSlots([]);
      }
    }

    fetchForecast();
  }, [location, sessionDate, durationMinutes, sport]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!location) {
      setError("Please select a location");
      return;
    }

    if (rating === 0) {
      setError("Please rate your session");
      return;
    }

    setSaving(true);

    try {
      const sessionTime = new Date(sessionDate).getTime();

      await client.mutation(api.journal.createEntry, {
        sessionToken,
        sport,
        spotId: location.type === "spot" ? location.spotId : undefined,
        customLocation: location.type === "custom" ? location.location : undefined,
        sessionDate: sessionTime,
        durationMinutes,
        rating,
        sessionNotes: sessionNotes.trim() || undefined,
        conditionNotes: conditionNotes.trim() || undefined,
      });

      router.push("/journal");
    } catch (err) {
      console.error("Error creating entry:", err);
      setError(err.message || "Failed to create entry");
      setSaving(false);
    }
  };

  if (!sessionToken) {
    router.push("/auth/login");
    return null;
  }

  return (
    <MainLayout>
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <button
          onClick={() => router.push("/journal")}
          className="flex items-center gap-2 text-ink hover:text-ink/70 transition-colors mb-6 -ml-2"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back to journal</span>
        </button>

        <h1 className="text-3xl font-semibold text-ink mb-8">Log Session</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sport Selection */}
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-2">
              Sport
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSport("wingfoil")}
                className={`flex-1 px-4 py-3 rounded-md border-2 transition-all ${
                  sport === "wingfoil"
                    ? "border-ink bg-ink/5"
                    : "border-ink/20 hover:border-ink/30"
                }`}
              >
                Wingfoiling
              </button>
              <button
                type="button"
                onClick={() => setSport("surfing")}
                className={`flex-1 px-4 py-3 rounded-md border-2 transition-all ${
                  sport === "surfing"
                    ? "border-ink bg-ink/5"
                    : "border-ink/20 hover:border-ink/30"
                }`}
              >
                Surfing
              </button>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-2">
              Location
            </label>
            <LocationPicker
              sport={sport}
              value={location}
              onChange={setLocation}
              sessionToken={sessionToken}
            />
          </div>

          {/* Date & Time */}
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-2">
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full px-4 py-2 border-2 border-ink/20 rounded-md focus:outline-none focus:border-ink text-ink"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-2">
              Duration
            </label>
            <DurationInput value={durationMinutes} onChange={setDurationMinutes} />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-2">
              Rating
            </label>
            <RatingInput value={rating} onChange={setRating} />
          </div>

          {/* Session Notes */}
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-2">
              Session Notes (optional)
            </label>
            <textarea
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="e.g., Amazing session! The wind filled in perfectly around 2pm. I practiced my jibes and landed 3 clean ones. Water was warm enough for just a shorty."
              rows={4}
              className="w-full px-4 py-2 border-2 border-ink/20 rounded-md focus:outline-none focus:border-ink text-ink placeholder:text-ink/40"
            />
          </div>

          {/* Condition Notes */}
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-2">
              Conditions Notes (optional)
            </label>
            <textarea
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
              placeholder={
                sport === "wingfoil"
                  ? "e.g., Wind was steady 18-20 knots from NW, occasional gusts to 23. Small wind chop, no real swell. Tide was mid-low and rising. Less crowded than expected."
                  : "e.g., Waves were chest to head high, clean and glassy. Sets coming through every 5-6 minutes with 3-4 waves per set. Light offshore breeze. Mid-tide rising."
              }
              rows={4}
              className="w-full px-4 py-2 border-2 border-ink/20 rounded-md focus:outline-none focus:border-ink text-ink placeholder:text-ink/40"
            />
          </div>

          {/* Forecast Preview */}
          {location?.type === "spot" && location.spotId && (
            <div>
              <label className="block text-sm font-medium text-ink/70 mb-2">
                Forecast Preview
              </label>
              <ForecastComparison forecastSlots={forecastSlots} sport={sport} />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.push("/journal")}
              className="flex-1 px-4 py-3 border-2 border-ink/20 text-ink rounded-md hover:border-ink/30 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 bg-ink text-newsprint rounded-md hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging...
                </span>
              ) : (
                "Log Session"
              )}
            </button>
          </div>
        </form>
      </div>
      <Footer />
    </MainLayout>
  );
}
