"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "../../../../components/auth/AuthProvider";
import { MainLayout } from "../../../../components/layout/MainLayout";
import { Header } from "../../../../components/layout/Header";
import { Footer } from "../../../../components/layout/Footer";
import { Loader2, ArrowLeft, Check } from "lucide-react";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

const SKILL_LEVELS = [
  {
    id: "beginner",
    label: "Beginner",
    description: "Learning fundamentals, needs forgiving conditions",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "Consistent in moderate conditions, building skills",
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Comfortable in challenging conditions, refining technique",
  },
  {
    id: "expert",
    label: "Expert",
    description: "Handles any conditions, seeks challenge",
  },
];

const PLACEHOLDER_TEXT = {
  wingfoil:
    "e.g., I weigh 85kg so I need at least 14-15 knots to get on foil consistently. I'm still learning to jibe, so I prefer flat water or small chop. I ride a 95L board with a 5m wing. Strong gusts make me nervous - I prefer steady wind even if it's a bit lighter.",
  surfing:
    "e.g., I've been surfing for about a year. I'm comfortable on a 7'6\" funboard but still learning on a shortboard. Waves over 1.5m intimidate me. I prefer mellow, peeling waves where I have time to pop up. Crowded lineups stress me out.",
};

const SPORT_LABELS = {
  wingfoil: "Wingfoiling",
  surfing: "Surfing",
};

export default function SportProfilePage({ params }) {
  const resolvedParams = use(params);
  const sport = resolvedParams.sport;
  const router = useRouter();
  const { sessionToken } = useAuth();

  const [skillLevel, setSkillLevel] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [scoringResult, setScoringResult] = useState(null);

  // Validate sport
  const isValidSport = sport === "wingfoil" || sport === "kitesurfing" || sport === "surfing";

  // Redirect if not authenticated
  useEffect(() => {
    if (!sessionToken) {
      router.push("/auth/login");
    }
  }, [sessionToken, router]);

  // Load existing profile
  useEffect(() => {
    if (!sessionToken || !isValidSport) return;

    async function loadProfile() {
      setLoading(true);
      try {
        const profile = await client.query(api.personalization.getSportProfile, {
          sessionToken,
          sport,
        });

        if (profile) {
          setSkillLevel(profile.skillLevel);
          setContext(profile.context || "");
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [sessionToken, sport, isValidSport]);

  const handleSave = async () => {
    if (!skillLevel) {
      setError("Please select your skill level");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess(false);
    setScoringResult(null);

    try {
      // Save the profile
      await client.mutation(api.personalization.upsertSportProfile, {
        sessionToken,
        sport,
        skillLevel,
        context: context.trim() || undefined,
      });

      setSuccess(true);
      setSaving(false);
      
      // Trigger personalized scoring
      setScoring(true);
      try {
        const result = await client.action(api.personalization.scorePersonalizedSlots, {
          sessionToken,
          sport,
        });
        setScoringResult(result);
      } catch (scoringErr) {
        console.error("Scoring error:", scoringErr);
        // Don't show error, scoring is optional enhancement
        setScoringResult({ slotsScored: 0, message: "Scores will generate in background" });
      } finally {
        setScoring(false);
      }
      
      // Redirect back to profile after showing results
      setTimeout(() => {
        router.push("/profile");
      }, 3000);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError(err.message || "Failed to save profile");
      setSaving(false);
    }
  };

  if (!isValidSport) {
    return (
      <MainLayout>
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-semibold text-ink mb-4">Invalid Sport</h1>
          <p className="text-ink/60 mb-6">
            The sport "{sport}" is not recognized. Please choose wingfoil, kitesurfing, or surfing.
          </p>
          <button
            onClick={() => router.push("/profile")}
            className="text-ink hover:text-ink/70 transition-colors"
          >
            ← Back to Profile
          </button>
        </div>
        <Footer />
      </MainLayout>
    );
  }

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

        <h1 className="text-3xl font-semibold text-ink mb-2">
          {SPORT_LABELS[sport]} Profile
        </h1>
        <p className="text-ink/60 mb-8">
          Help us personalize condition scores for you. The more detail you provide,
          the better we can tailor scores to your skill level and preferences.
        </p>

        <div className="space-y-8">
          {/* Skill Level */}
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-3">
              Skill Level <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {SKILL_LEVELS.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setSkillLevel(level.id)}
                  className={`w-full p-4 rounded-md border-2 transition-all text-left ${
                    skillLevel === level.id
                      ? "border-ink bg-ink/5"
                      : "border-ink/20 hover:border-ink/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink">{level.label}</p>
                      <p className="text-sm text-ink/60">{level.description}</p>
                    </div>
                    {skillLevel === level.id && (
                      <Check className="w-5 h-5 text-ink" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Context */}
          <div>
            <label
              htmlFor="context"
              className="block text-sm font-medium text-ink/70 mb-2"
            >
              About You (optional but recommended)
            </label>
            <p className="text-sm text-ink/50 mb-3">
              Tell us about your physical factors, equipment, preferences, and any
              constraints that affect what conditions work for you.
            </p>
            <textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder={PLACEHOLDER_TEXT[sport]}
              rows={6}
              maxLength={1000}
              className="w-full px-4 py-3 bg-white border-2 border-ink/20 rounded-md focus:outline-none focus:border-ink text-ink placeholder:text-ink/40 transition-colors resize-none"
            />
            <p className="text-xs text-ink/40 mt-1 text-right">
              {context.length}/1000 characters
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="text-green-700 text-sm flex items-center gap-2 font-medium">
                <Check className="w-4 h-4" />
                Profile saved! Redirecting...
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving || success || !skillLevel}
              className="w-full bg-ink text-newsprint py-3 px-4 rounded-md hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : success ? (
                <span className="flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  Saved!
                </span>
              ) : (
                "Save Profile"
              )}
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </MainLayout>
  );
}
