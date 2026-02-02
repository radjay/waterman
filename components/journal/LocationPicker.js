"use client";

import { useState, useEffect } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { useUser } from "../auth/AuthProvider";
import { MapPin, Search, Star } from "lucide-react";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export function LocationPicker({ sport, value, onChange, sessionToken }) {
  const user = useUser();
  const [spots, setSpots] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customLocation, setCustomLocation] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSpots() {
      try {
        const allSpots = await client.query(api.spots.list, {
          sports: sport ? [sport] : undefined,
        });
        setSpots(allSpots);
      } catch (err) {
        console.error("Error loading spots:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSpots();
  }, [sport, user]);

  const filteredSpots = spots.filter((spot) =>
    spot.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort spots: favorites first, then alphabetically
  const sortedSpots = [...filteredSpots].sort((a, b) => {
    const aIsFavorite = user?.favoriteSpots?.includes(a._id) || false;
    const bIsFavorite = user?.favoriteSpots?.includes(b._id) || false;
    
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    return a.name.localeCompare(b.name);
  });

  const handleSpotSelect = (spotId) => {
    setShowCustom(false);
    setCustomLocation("");
    onChange({ type: "spot", spotId });
  };

  const handleCustomSelect = () => {
    setShowCustom(true);
    onChange({ type: "custom", location: customLocation });
  };

  const handleCustomLocationChange = (location) => {
    setCustomLocation(location);
    onChange({ type: "custom", location });
  };

  // Initialize value
  useEffect(() => {
    if (value?.type === "custom") {
      setShowCustom(true);
      setCustomLocation(value.location || "");
    } else if (value?.type === "spot") {
      setShowCustom(false);
    }
  }, [value]);

  if (loading) {
    return <div className="text-ink/60">Loading spots...</div>;
  }

  return (
    <div className="space-y-4">
      {!showCustom ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ink/40" />
            <input
              type="text"
              placeholder="Search spots..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-ink/20 rounded-md focus:outline-none focus:border-ink text-ink"
            />
          </div>

          {/* All Spots (favorites at top) */}
          <div>
            <div className="text-sm font-medium text-ink/70 mb-2">
              {searchQuery ? "Search Results" : "Spots"}
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 border-2 border-ink/20 rounded-md p-3">
              {sortedSpots.length === 0 ? (
                <div className="text-center py-4 text-ink/50 text-sm">
                  No spots found
                </div>
              ) : (
                sortedSpots.map((spot) => {
                  const isFavorite = user?.favoriteSpots?.includes(spot._id) || false;
                  return (
                    <button
                      key={spot._id}
                      type="button"
                      onClick={() => handleSpotSelect(spot._id)}
                      className={`w-full p-3 rounded-md border-2 text-left transition-all ${
                        value?.spotId === spot._id
                          ? "border-ink bg-ink/5"
                          : "border-ink/20 hover:border-ink/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-ink/50" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-ink">{spot.name}</div>
                            {isFavorite && (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          {spot.country && (
                            <div className="text-sm text-ink/60">{spot.country}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Custom Location Option */}
          <div className="border-t border-ink/10 pt-4">
            <button
              type="button"
              onClick={handleCustomSelect}
              className="w-full p-3 rounded-md border-2 border-ink/20 hover:border-ink/30 transition-all text-left"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-ink/50" />
                <span className="text-ink">Use custom location</span>
              </div>
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-ink/70">
              Custom Location
            </label>
            <button
              type="button"
              onClick={() => {
                setShowCustom(false);
                setCustomLocation("");
                onChange({ type: null });
              }}
              className="px-3 py-1.5 text-sm font-medium text-ink border-2 border-ink/20 rounded-md hover:border-ink/30 hover:bg-ink/5 transition-all"
            >
              ← Back to spots
            </button>
          </div>
          <input
            type="text"
            placeholder="e.g., Praia de Matosinhos"
            value={customLocation}
            onChange={(e) => handleCustomLocationChange(e.target.value)}
            className="w-full px-4 py-2 border-2 border-ink/20 rounded-md focus:outline-none focus:border-ink text-ink"
          />
        </div>
      )}
    </div>
  );
}
