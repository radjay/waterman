"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { useAuth, useUser } from "../../components/auth/AuthProvider";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { Loader2, User, MapPin } from "lucide-react";
import { Heading } from "../../components/ui/Heading";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { Divider } from "../../components/ui/Divider";
import { SportBadge } from "../../components/ui/SportBadge";
import { SettingsSection } from "../../components/ui/SettingsSection";
import { SettingsRow } from "../../components/ui/SettingsRow";
import { Switch } from "../../components/ui/Switch";
import { useTheme } from "../../components/theme/ThemeProvider";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

const THEME_OPTIONS = [
  { id: "auto", label: "Auto", hint: "Follows local sunrise and sunset" },
  { id: "night", label: "Night", hint: "Nightglass, always" },
  { id: "day", label: "Day", hint: "Dayglass, always" },
];

/**
 * Appearance. The app follows the sun by default, but auto-only switching is an
 * accessibility problem — a theme that flips itself mid-session with no way to
 * stop it is worse than either fixed theme.
 */
function ThemeSetting() {
  const { theme, preference, setPreference } = useTheme();

  return (
    <SettingsSection label="Appearance">
      <div className="flex flex-col gap-2">
        {THEME_OPTIONS.map((option) => {
          const selected = preference === option.id;
          const hint =
            option.id === "auto" && selected
              ? `${option.hint} · now ${theme}`
              : option.hint;
          return (
            <SettingsRow
              key={option.id}
              title={option.label}
              hint={hint}
              selected={selected}
              trailing="check"
              onClick={() => setPreference(option.id)}
            />
          );
        })}
      </div>
    </SettingsSection>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { sessionToken, refreshUser } = useAuth();
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

  useEffect(() => {
    if (!sessionToken) {
      router.push("/auth/login");
    }
  }, [sessionToken, router]);

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
        const fetchedSpots = await client.query(api.spots.list, {
          includeWebcams: true,
        });
        // Forecast spots first, then cam-only (Lagoa de Obidos, Guincho N, …).
        setSpots([
          ...fetchedSpots.filter((s) => !s.webcamOnly),
          ...fetchedSpots.filter((s) => s.webcamOnly),
        ]);
      } catch (err) {
        console.error("Error loading spots:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSpots();
  }, []);

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
      if (name !== (user?.name || "")) {
        await client.mutation(api.auth.updateUser, {
          sessionToken,
          name: name.trim() || undefined,
        });
      }

      await client.mutation(api.auth.updatePreferences, {
        sessionToken,
        favoriteSports,
        favoriteSpots,
      });

      setSuccess("Profile updated successfully!");
      window.location.reload();
    } catch (err) {
      console.error("Error saving profile:", err);
      setError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePersonalizedScores = async () => {
    const newValue = !showPersonalizedScores;
    setShowPersonalizedScores(newValue);
    try {
      await client.mutation(api.personalization.updatePersonalizationSettings, {
        sessionToken,
        showPersonalizedScores: newValue,
      });
      await refreshUser();
    } catch (err) {
      console.error("Error updating setting:", err);
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
          <Loader2 className="w-8 h-8 text-faded-ink animate-spin" />
        </div>
        <Footer />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header />
      <div className="pt-2 md:max-w-[560px]">
        <Heading level={1} className="mb-8">
          Settings
        </Heading>

        <div className="flex flex-col gap-8">
          <ThemeSetting />

          <SettingsSection label="Favorite sports">
            <div className="flex flex-col gap-2">
              {sports.map((sport) => {
                const selected = favoriteSports.includes(sport.id);
                return (
                  <SettingsRow
                    key={sport.id}
                    title={sport.label}
                    selected={selected}
                    trailing="check"
                    leading={
                      <SportBadge
                        sport={sport.id}
                        size={18}
                        className={selected ? "!text-accent" : "!text-dim"}
                      />
                    }
                    onClick={() => toggleSport(sport.id)}
                  />
                );
              })}
            </div>
          </SettingsSection>

          <SettingsSection label="Favorite spots">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-faded-ink animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-0.5">
                {spots.map((spot) => {
                  const selected = favoriteSpots.includes(spot._id);
                  return (
                    <SettingsRow
                      key={spot._id}
                      title={spot.name}
                      hint={
                        [spot.country, spot.webcamOnly ? "Cam only" : null]
                          .filter(Boolean)
                          .join(" · ") || undefined
                      }
                      selected={selected}
                      trailing="check"
                      onClick={() => toggleSpot(spot._id)}
                    />
                  );
                })}
              </div>
            )}
          </SettingsSection>

          <div>
            <Divider weight="medium" className="mb-8" />
            <SettingsSection label="Personalization">
              <Text variant="muted" className="text-sm mb-4 -mt-1">
                Set up sport profiles to get condition scores personalized for your
                skill level and preferences.
              </Text>
              <div className="flex flex-col gap-2">
                {sports.map((sport) => {
                  const profile = getSportProfile(sport.id);
                  return (
                    <SettingsRow
                      key={sport.id}
                      title={`${sport.fullLabel} profile`}
                      hint={
                        profile
                          ? `${SKILL_LEVEL_LABELS[profile.skillLevel]}${
                              profile.context ? " · Has context" : ""
                            }`
                          : "Not set up yet"
                      }
                      trailing="chevron"
                      leading={
                        <span
                          className={`w-9 h-9 rounded-full flex items-center justify-center flex-none ${
                            profile ? "bg-accent-tint" : "bg-track"
                          }`}
                        >
                          <User
                            size={16}
                            className={profile ? "text-accent" : "text-dim"}
                          />
                        </span>
                      }
                      onClick={() => router.push(`/profile/sport/${sport.id}`)}
                    />
                  );
                })}

                <SettingsRow
                  title="Spot notes"
                  hint={
                    spotContextCount > 0
                      ? `${spotContextCount} spot${
                          spotContextCount !== 1 ? "s" : ""
                        } with notes`
                      : "Add notes about your favorite spots"
                  }
                  trailing="chevron"
                  leading={
                    <span
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-none ${
                        spotContextCount > 0 ? "bg-accent-tint" : "bg-track"
                      }`}
                    >
                      <MapPin
                        size={16}
                        className={spotContextCount > 0 ? "text-accent" : "text-dim"}
                      />
                    </span>
                  }
                  onClick={() => router.push("/profile/spots")}
                />

                {sportProfiles.length > 0 && (
                  <SettingsRow
                    title="Show personalized scores"
                    hint="When off, you see the default system scores"
                    role="switch"
                    pressed={showPersonalizedScores}
                    trailing={
                      <Switch
                        checked={showPersonalizedScores}
                        onChange={handleTogglePersonalizedScores}
                        ariaLabel="Show personalized scores"
                      />
                    }
                    onClick={handleTogglePersonalizedScores}
                  />
                )}
              </div>
            </SettingsSection>
          </div>

          {error && <Text className="text-marginal text-sm">{error}</Text>}
          {success && <Text className="text-accent text-sm">{success}</Text>}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={saving}
            onClick={handleSave}
            className="md:w-auto md:self-start md:px-8"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
      <Footer />
    </MainLayout>
  );
}
