"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { useAuth, useUser } from "../../components/auth/AuthProvider";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { Loader2, CheckCircle } from "lucide-react";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function ProfilePage() {
  const router = useRouter();
  const { sessionToken, logout: authLogout } = useAuth();
  const user = useUser();

  const [name, setName] = useState("");
  const [favoriteSports, setFavoriteSports] = useState([]);
  const [favoriteSpots, setFavoriteSpots] = useState([]);
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sports = [
    { id: "wingfoil", label: "Wing" },
    { id: "surfing", label: "Surf" },
  ];

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
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-semibold text-ink mb-8">Profile</h1>

        <div className="space-y-8">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-2">
              Email
            </label>
            <div className="px-4 py-3 bg-ink/5 border-2 border-ink/20 rounded-md text-ink">
              {user.email}
            </div>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-ink/70 mb-2">
              Name (optional)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 bg-white border-2 border-ink/20 rounded-md focus:outline-none focus:border-ink text-ink placeholder:text-ink/40 transition-colors"
            />
          </div>

          {/* Favorite Sports */}
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-3">
              Favorite Sports
            </label>
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
                    <span className="font-medium text-ink">{sport.label}</span>
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
            <label className="block text-sm font-medium text-ink/70 mb-3">
              Favorite Spots (optional)
            </label>
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

          {/* Error/Success Messages */}
          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="text-green-600 text-sm">
              {success}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-ink text-newsprint py-3 px-4 rounded-md hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </button>

            <button
              onClick={handleLogout}
              disabled={saving}
              className="w-full border-2 border-ink/20 text-ink py-3 px-4 rounded-md hover:border-ink/30 transition-colors disabled:opacity-50"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </MainLayout>
  );
}
