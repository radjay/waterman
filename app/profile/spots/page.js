"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "../../../components/auth/AuthProvider";
import { MainLayout } from "../../../components/layout/MainLayout";
import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import { Loader2, ArrowLeft, Check, MapPin, ChevronDown, ChevronUp } from "lucide-react";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

const SPORT_LABELS = {
  wingfoil: "Wingfoiling",
  surfing: "Surfing",
};

const PLACEHOLDER_TEXT = {
  wingfoil:
    "e.g., This is my go-to spot for learning wingfoiling. It's sheltered from most swells which I like as a beginner. Wind needs to be at least 15 knots for me (I'm heavy). If the swell is over 3m even with good wind, I'd rather go elsewhere because the chop becomes too messy.",
  surfing:
    "e.g., Perfect beginner spot for me. The waves are gentle and the sand bottom is forgiving. Avoid at high tide though - the shore break gets dumpy. Works best with SW swell direction.",
};

function SpotContextCard({ spot, existingContexts, sessionToken, onSave }) {
  const [expanded, setExpanded] = useState(false);
  const [contexts, setContexts] = useState({});
  const [saving, setSaving] = useState({});
  const [scoring, setScoring] = useState({});
  const [success, setSuccess] = useState({});
  const [scoringResult, setScoringResult] = useState({});

  // Initialize contexts from existing data
  useEffect(() => {
    const initial = {};
    for (const sport of spot.sports) {
      const existing = existingContexts.find(
        (c) => c.spotId === spot._id && c.sport === sport
      );
      initial[sport] = {
        context: existing?.context || "",
        isExpertInput: existing?.isExpertInput || false,
        contextId: existing?._id,
      };
    }
    setContexts(initial);
  }, [spot, existingContexts]);

  const handleSave = async (sport) => {
    setSaving((prev) => ({ ...prev, [sport]: true }));
    setSuccess((prev) => ({ ...prev, [sport]: false }));
    setScoringResult((prev) => ({ ...prev, [sport]: null }));

    try {
      await client.mutation(api.personalization.upsertSpotContext, {
        sessionToken,
        spotId: spot._id,
        sport,
        context: contexts[sport]?.context || "",
        isExpertInput: contexts[sport]?.isExpertInput || false,
      });

      setSuccess((prev) => ({ ...prev, [sport]: true }));
      setSaving((prev) => ({ ...prev, [sport]: false }));
      onSave && onSave();

      // Trigger personalized scoring for this sport
      setScoring((prev) => ({ ...prev, [sport]: true }));
      try {
        const result = await client.action(api.personalization.scorePersonalizedSlots, {
          sessionToken,
          sport,
        });
        setScoringResult((prev) => ({ ...prev, [sport]: result }));
      } catch (scoringErr) {
        console.error("Scoring error:", scoringErr);
        // Don't show error - scoring is optional
      } finally {
        setScoring((prev) => ({ ...prev, [sport]: false }));
      }

      // Clear success after 5 seconds
      setTimeout(() => {
        setSuccess((prev) => ({ ...prev, [sport]: false }));
        setScoringResult((prev) => ({ ...prev, [sport]: null }));
      }, 5000);
    } catch (err) {
      console.error("Error saving spot context:", err);
      setSaving((prev) => ({ ...prev, [sport]: false }));
    }
  };

  const hasContext = Object.values(contexts).some((c) => c.context?.trim());

  return (
    <div className="border-2 border-ink/20 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-ink/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-ink/60" />
          <div className="text-left">
            <p className="font-medium text-ink">{spot.name}</p>
            {spot.country && (
              <p className="text-sm text-ink/60">{spot.country}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasContext && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
              Has context
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-ink/60" />
          ) : (
            <ChevronDown className="w-5 h-5 text-ink/60" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-ink/10 p-4 space-y-6">
          {spot.sports.map((sport) => (
            <div key={sport} className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-ink/70">
                  {SPORT_LABELS[sport] || sport} Notes
                </label>
                <div className="flex items-center gap-2">
                  {success[sport] && !scoring[sport] && !scoringResult[sport] && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Saved
                    </span>
                  )}
                  {scoring[sport] && (
                    <span className="text-xs text-ink/60 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Scoring...
                    </span>
                  )}
                  {scoringResult[sport]?.slotsScored > 0 && (
                    <span className="text-xs text-green-600">
                      ✓ {scoringResult[sport].slotsScored} slots scored
                    </span>
                  )}
                </div>
              </div>

              <textarea
                value={contexts[sport]?.context || ""}
                onChange={(e) =>
                  setContexts((prev) => ({
                    ...prev,
                    [sport]: { ...prev[sport], context: e.target.value },
                  }))
                }
                placeholder={PLACEHOLDER_TEXT[sport] || "What works for you at this spot?"}
                rows={4}
                maxLength={1000}
                className="w-full px-4 py-3 bg-white border-2 border-ink/20 rounded-md focus:outline-none focus:border-ink text-ink placeholder:text-ink/40 transition-colors resize-none text-sm"
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contexts[sport]?.isExpertInput || false}
                    onChange={(e) =>
                      setContexts((prev) => ({
                        ...prev,
                        [sport]: { ...prev[sport], isExpertInput: e.target.checked },
                      }))
                    }
                    className="h-4 w-4 text-ink focus:ring-ink border-ink/30 rounded"
                  />
                  <span className="text-xs text-ink/60">
                    I'm an expert at this spot (your input may help improve default scoring)
                  </span>
                </label>

                <button
                  onClick={() => handleSave(sport)}
                  disabled={saving[sport]}
                  className="px-4 py-2 bg-ink text-newsprint text-sm rounded-md hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving[sport] ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SpotContextPage() {
  const router = useRouter();
  const { sessionToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [spots, setSpots] = useState([]);
  const [existingContexts, setExistingContexts] = useState([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!sessionToken) {
      router.push("/auth/login");
    }
  }, [sessionToken, router]);

  // Load data
  useEffect(() => {
    if (!sessionToken) return;

    async function loadData() {
      setLoading(true);
      try {
        const [spotsData, contextsData] = await Promise.all([
          client.query(api.personalization.getFavoriteSpotsWithDetails, {
            sessionToken,
          }),
          client.query(api.personalization.getAllSpotContexts, {
            sessionToken,
          }),
        ]);

        setSpots(spotsData);
        setExistingContexts(contextsData);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [sessionToken]);

  const refreshContexts = async () => {
    try {
      const contextsData = await client.query(
        api.personalization.getAllSpotContexts,
        { sessionToken }
      );
      setExistingContexts(contextsData);
    } catch (err) {
      console.error("Error refreshing contexts:", err);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 text-ink/60 animate-spin" />
        </div>
        <Footer />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Back button */}
        <button
          onClick={() => router.push("/profile")}
          className="flex items-center gap-2 text-ink hover:text-ink/70 transition-colors mb-6 -ml-2"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back to profile</span>
        </button>

        <h1 className="text-3xl font-semibold text-ink mb-2">Spot Notes</h1>
        <p className="text-ink/60 mb-8">
          Add personal notes about what works (or doesn't) for you at each spot.
          These notes help us generate scores tailored to your experience.
        </p>

        {spots.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-ink/20 rounded-lg">
            <MapPin className="w-12 h-12 text-ink/30 mx-auto mb-4" />
            <p className="text-ink/60 mb-2">No favorite spots yet</p>
            <p className="text-sm text-ink/40">
              Add some favorite spots from your profile to add notes about them.
            </p>
            <button
              onClick={() => router.push("/profile")}
              className="mt-4 text-ink hover:text-ink/70 underline text-sm"
            >
              Go to profile
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {spots.map((spot) => (
              <SpotContextCard
                key={spot._id}
                spot={spot}
                existingContexts={existingContexts}
                sessionToken={sessionToken}
                onSave={refreshContexts}
              />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </MainLayout>
  );
}
