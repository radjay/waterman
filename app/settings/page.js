"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { useAuth, useUser } from "../../components/auth/AuthProvider";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { Loader2, CheckCircle, User, ChevronRight, Sparkles, MapPin } from "lucide-react";
import { Heading } from "../../components/ui/Heading";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { Divider } from "../../components/ui/Divider";
import { SportBadge } from "../../components/ui/SportBadge";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function ProfilePage() {
  const router = useRouter();
  const { sessionToken, logout: authLogout, refreshUser } = useAuth();
  const user = useUser();

  const [name, setName] = useState("");
  const [favoriteSports, setFavoriteSports] = useState([]);
  const [favoriteSpots, setFavoriteSpots] = useState([]);
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sportProfiles, setSportProfiles] = useState([]);
  const [spotContextCount, setSpotContextCount] = useState(0);
  const [showPersonalizedScores, setShowPersonalizedScores] = useState(true);

  const sports = [
    { id: "wingfoil", label: "Wing", fullLabel: "Wingfoiling" },
    { id: "kitesurfing", label: "Kite", fullLabel: "Kitesurfing" },
    { id: "surfing", label: "Surf", fullLabel: "Surfing" },
  ];

  const SKILL_LEVEL_LABELS = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    expert: "Expert",
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionToken) {
      router.push("/auth/login");
    }
  }, [sessionToken, router]);

  // Load user data and spots
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setFavoriteSports(user.favoriteSports || []);
      setFavoriteSpots(user.favoriteSpots || []);
    }
  }, [user]);

  useEffect(() => {
    async function fetchSpots() {
      setLoading(true);
      try {
        const fetchedSpots = await client.query(api.spots.list, {});
        setSpots(fetchedSpots);
      } catch (err) {
        console.error("Error loading spots:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSpots();
  }, []);

  // Load sport profiles and personalization settings
  useEffect(() => {
    if (!sessionToken) return;

    async function fetchPersonalizationData() {
      try {
        const [profiles, settings, spotContexts] = await Promise.all([
          client.query(api.personalization.getAllSportProfiles, { sessionToken }),
          client.query(api.personalization.getPersonalizationSettings, { sessionToken }),
          client.query(api.personalization.getAllSpotContexts, { sessionToken }),
        ]);
        setSportProfiles(profiles);
        setShowPersonalizedScores(settings.showPersonalizedScores);
        setSpotContextCount(spotContexts.length);
      } catch (err) {
        console.error("Error loading personalization data:", err);
      }
    }
    fetchPersonalizationData();
  }, [sessionToken]);

  const toggleSport = (sportId) => {
    setFavoriteSports((prev) =>
      prev.includes(sportId)
        ? prev.filter((s) => s !== sportId)
        : [...prev, sportId]
    );
  };

  const toggleSpot = (spotId) => {
    setFavoriteSpots((prev) =>
      prev.includes(spotId)
        ? prev.filter((id) => id !== spotId)
        : [...prev, spotId]
    );
  };

  const handleSave = async () => {
    if (favoriteSports.length === 0) {
      setError("Please select at least one sport");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Update user name if changed
      if (name !== (user?.name || "")) {
        await client.mutation(api.auth.updateUser, {
          sessionToken,
          name: name.trim() || undefined,
        });
      }

      // Update preferences
      await client.mutation(api.auth.updatePreferences, {
        sessionToken,
        favoriteSports,
        favoriteSpots,
      });

      setSuccess("Profile updated successfully!");
      
      // Refresh user data
      window.location.reload();
    } catch (err) {
      console.error("Error saving profile:", err);
      setError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await authLogout();
    router.push("/");
  };

  const handleTogglePersonalizedScores = async () => {
    const newValue = !showPersonalizedScores;
    setShowPersonalizedScores(newValue);
    try {
      await client.mutation(api.personalization.updatePersonalizationSettings, {
        sessionToken,
        showPersonalizedScores: newValue,
      });
      // Refresh user data so HomeContent picks up the new setting
      await refreshUser();
    } catch (err) {
      console.error("Error updating setting:", err);
      // Revert on error
      setShowPersonalizedScores(!newValue);
    }
  };

  const getSportProfile = (sportId) => {
    return sportProfiles.find((p) => p.sport === sportId);
  };

  if (!user) {
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
      <div className="pt-2 pb-24">
        <Heading level={1} className="mb-8">Settings</Heading>

        <div className="space-y-8">
          {/* Favorite Sports */}
          <div>
            <Text variant="label" as="label" className="block mb-3">Favorite Sports</Text>
            <div className="space-y-2">
              {sports.map((sport) => (
                <button
                  key={sport.id}
                  onClick={() => toggleSport(sport.id)}
                  className={`w-full p-4 rounded-md border-2 transition-all text-left ${
                    favoriteSports.includes(sport.id)
                      ? "border-ink bg-ink/5"
                      : "border-ink/20 hover:border-ink/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium text-ink">
                      <SportBadge sport={sport.id} size={18} className={favoriteSports.includes(sport.id) ? "!text-ink" : "!text-ink/40"} />
                      {sport.label}
                    </span>
                    {favoriteSports.includes(sport.id) && (
                      <CheckCircle className="w-5 h-5 text-ink" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Favorite Spots */}
          <div>
            <Text variant="label" as="label" className="block mb-3">Favorite Spots (optional)</Text>
            {loading ? (
              <div className="flex items-center justify-center py-8">
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
          </div>

          {/* Personalization Section */}
          <div className="pt-8">
            <Divider weight="medium" className="mb-8" />
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-ink" />
              <Heading level={2}>Personalization</Heading>
            </div>
            <Text variant="muted" className="text-sm mb-6">
              Set up sport profiles to get condition scores personalized for your skill level and preferences.
            </Text>

            {/* Sport Profiles */}
            <div className="space-y-3 mb-6">
              {sports.map((sport) => {
                const profile = getSportProfile(sport.id);
                return (
                  <button
                    key={sport.id}
                    onClick={() => router.push(`/profile/sport/${sport.id}`)}
                    className="w-full p-4 rounded-md border-2 border-ink/20 hover:border-ink/30 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          profile ? "bg-ink/10" : "bg-ink/5"
                        }`}>
                          <User className={`w-5 h-5 ${profile ? "text-ink" : "text-ink/40"}`} />
                        </div>
                        <div>
                          <p className="font-medium text-ink">{sport.fullLabel} Profile</p>
                          {profile ? (
                            <p className="text-sm text-ink/60">
                              {SKILL_LEVEL_LABELS[profile.skillLevel]}
                              {profile.context && " • Has context"}
                            </p>
                          ) : (
                            <p className="text-sm text-ink/40">Not set up yet</p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-ink/40 group-hover:text-ink/60 transition-colors" />
                    </div>
                  </button>
                );
              })}

              {/* Spot Notes */}
              <button
                onClick={() => router.push("/profile/spots")}
                className="w-full p-4 rounded-md border-2 border-ink/20 hover:border-ink/30 transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      spotContextCount > 0 ? "bg-ink/10" : "bg-ink/5"
                    }`}>
                      <MapPin className={`w-5 h-5 ${spotContextCount > 0 ? "text-ink" : "text-ink/40"}`} />
                    </div>
                    <div>
                      <p className="font-medium text-ink">Spot Notes</p>
                      {spotContextCount > 0 ? (
                        <p className="text-sm text-ink/60">
                          {spotContextCount} spot{spotContextCount !== 1 ? "s" : ""} with notes
                        </p>
                      ) : (
                        <p className="text-sm text-ink/40">Add notes about your favorite spots</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-ink/40 group-hover:text-ink/60 transition-colors" />
                </div>
              </button>
            </div>

            {/* Show Personalized Scores Toggle */}
            {sportProfiles.length > 0 && (
              <div className="flex items-center justify-between p-4 rounded-md border-2 border-ink/20">
                <div>
                  <p className="font-medium text-ink">Show personalized scores</p>
                  <p className="text-sm text-ink/60">
                    When off, you'll see the default system scores instead
                  </p>
                </div>
                <div
                  role="switch"
                  aria-checked={showPersonalizedScores}
                  tabIndex={0}
                  onClick={handleTogglePersonalizedScores}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleTogglePersonalizedScores();
                    }
                  }}
                  className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                    showPersonalizedScores ? "bg-ink" : "bg-ink/20"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${
                      showPersonalizedScores ? "left-6" : "left-1"
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error/Success Messages */}
          {error && <Text className="text-red-600 text-sm">{error}</Text>}
          {success && <Text className="text-green-600 text-sm">{success}</Text>}

        </div>
      </div>

      {/* Floating Save Button */}
      <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-auto md:right-6 md:w-auto z-40 p-4 md:p-0 bg-newsprint/90 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none border-t border-ink/10 md:border-0" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}>
        <Button variant="primary" size="lg" fullWidth className="md:w-auto md:px-8" loading={saving} onClick={handleSave}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
      <Footer />
    </MainLayout>
  );
}
