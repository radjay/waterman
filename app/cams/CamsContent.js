"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { Loader } from "../../components/common/Loader";
import { EmptyState } from "../../components/common/EmptyState";
import { WebcamCard } from "../../components/webcam/WebcamCard";
import { WebcamFullscreen } from "../../components/webcam/WebcamFullscreen";
import { TvMode } from "../../components/webcam/TvMode";
import { useAuth, useUser } from "../../components/auth/AuthProvider";
import { Tv, MapPin, SlidersHorizontal, X } from "lucide-react";
import { PillToggle } from "../../components/ui/PillToggle";
import { FilterGroup } from "../../components/ui/FilterGroup";
import { enrichSlots } from "../../lib/slots";
import { isDaylightSlot, isAfterSunset, isNighttimeSlot } from "../../lib/daylight";
import { ScoreModal } from "../../components/common/ScoreModal";
import Link from "next/link";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

// ---------------------------------------------------------------------------
// Helpers for initializing state from server-prefetched data
// ---------------------------------------------------------------------------

function buildInitialWebcams(initialData) {
  if (!initialData) return [];
  return initialData.spots;
}

function buildInitialSpotsMap(initialData) {
  if (!initialData) return {};
  const map = {};
  initialData.spots.forEach((s) => { map[s._id] = s; });
  return map;
}

function buildInitialSlots(initialData) {
  if (!initialData) return [];
  // Pre-populate with wingfoil data (the default sport on first render).
  // Once the user's sport preference loads, the component re-fetches.
  const defaultSports = ["wingfoil"];
  return initialData.spots.flatMap((spot) => {
    const spotData = initialData.data[spot._id];
    if (!spotData || !spotData.slots) return [];
    const spotSports = spot.sports?.length > 0 ? spot.sports : ["wingfoil"];
    const relevantSports = spotSports.filter((s) => defaultSports.includes(s));
    const configs = Object.values(spotData.configs);
    return enrichSlots(spotData.slots, spot, configs, spotData.scoresMap, relevantSports);
  });
}

// ---------------------------------------------------------------------------

export default function CamsContent({ initialData = null }) {
  const router = useRouter();
  const { sessionToken } = useAuth();
  const user = useUser();

  const [webcams, setWebcams] = useState(() => buildInitialWebcams(initialData));
  const [enrichedSlots, setEnrichedSlots] = useState(() => buildInitialSlots(initialData));
  const [spotsMap, setSpotsMap] = useState(() => buildInitialSpotsMap(initialData));
  const [loading, setLoading] = useState(!initialData);
  const [focusedWebcam, setFocusedWebcam] = useState(null);
  const [favoriteSpots, setFavoriteSpots] = useState([]);
  const [scoreModalSlot, setScoreModalSlot] = useState(null);
  const [tvMode, setTvMode] = useState(false);
  const [selectedSport, setSelectedSport] = useState(""); // Empty = all sports
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const sportLabel = { "": "All", wingfoil: "Wing", kitesurfing: "Kite", surfing: "Surf" }[selectedSport];

  // Skip the first client-side fetch when we have server-prefetched data and
  // there is no authenticated user yet (no personalization to add).
  // The effect re-runs once the user loads or the sport filter changes.
  const skipFirstFetch = useRef(!!initialData);

  // Sync favorite spots from user
  useEffect(() => {
    if (user && user.favoriteSpots) {
      setFavoriteSpots(user.favoriteSpots);
    }
  }, [user]);

  // Fetch webcam spots + forecast data in a single round-trip
  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      // Only skip if there's no user yet; if the user is already known on
      // mount we should fetch personalized data immediately.
      if (!user) return;
    }

    let stale = false;

    async function fetchWebcams() {
      setLoading(true);
      try {
        const userSports = user?.favoriteSports?.length > 0
          ? user.favoriteSports
          : ["wingfoil"];
        const sports = selectedSport ? [selectedSport] : userSports;
        const usePersonalizedScores = user && user.showPersonalizedScores !== false;

        const camsData = await client.query(api.spots.getCamsData, {
          sports: selectedSport ? [selectedSport] : userSports,
          userId: usePersonalizedScores && user?._id ? user._id : undefined,
        });

        if (stale) return;

        setWebcams(camsData.spots);
        const map = {};
        camsData.spots.forEach((s) => { map[s._id] = s; });
        setSpotsMap(map);

        const allSlots = camsData.spots.flatMap((spot) => {
          const spotData = camsData.data[spot._id];
          if (!spotData || !spotData.slots) return [];
          const spotSports = spot.sports?.length > 0 ? spot.sports : ["wingfoil"];
          const relevantSports = selectedSport
            ? spotSports.filter((s) => s === selectedSport)
            : spotSports.filter((s) => sports.includes(s));
          const configs = Object.values(spotData.configs);
          return enrichSlots(spotData.slots, spot, configs, spotData.scoresMap, relevantSports);
        });

        setEnrichedSlots(allSlots);
      } catch (error) {
        console.error("Error fetching webcams:", error);
      } finally {
        if (!stale) setLoading(false);
      }
    }

    fetchWebcams();
    return () => { stale = true; };
  }, [selectedSport, user]);

  // Toggle favorite spot
  const handleToggleFavorite = async (spotId, e) => {
    e.stopPropagation();

    if (!sessionToken) {
      router.push("/auth/login");
      return;
    }

    const newFavorites = favoriteSpots.includes(spotId)
      ? favoriteSpots.filter((id) => id !== spotId)
      : [...favoriteSpots, spotId];
    setFavoriteSpots(newFavorites);

    try {
      await client.mutation(api.auth.updatePreferences, {
        sessionToken,
        favoriteSpots: newFavorites,
      });
    } catch (error) {
      console.error("Error updating favorites:", error);
      setFavoriteSpots(favoriteSpots);
    }
  };

  // Build forecast data map: spotId → forecastData for current time window
  const forecastBySpot = useMemo(() => {
    if (enrichedSlots.length === 0) return {};

    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const SLOT_DURATION = 3 * 60 * 60 * 1000;

    // Filter to daylight slots
    const daylightSlots = enrichedSlots.filter((slot) => {
      if (slot.isTideOnly) return false;
      if (isNighttimeSlot(new Date(slot.timestamp))) return false;
      const spot = spotsMap[slot.spotId];
      if (!spot) return false;
      if (!isDaylightSlot(new Date(slot.timestamp), spot)) return false;
      if (isAfterSunset(new Date(slot.timestamp), spot)) return false;
      return true;
    });

    // Current time window slots
    let candidates = daylightSlots.filter((slot) => {
      const slotStart = slot.timestamp;
      const slotEnd = slotStart + SLOT_DURATION;
      return slotStart <= now && now < slotEnd;
    });

    // Fallback to next upcoming today
    if (candidates.length === 0) {
      const upcoming = daylightSlots
        .filter((slot) => {
          const slotDate = new Date(slot.timestamp);
          slotDate.setHours(0, 0, 0, 0);
          return slotDate.getTime() === todayMs && slot.timestamp > now;
        })
        .sort((a, b) => a.timestamp - b.timestamp);
      if (upcoming.length > 0) {
        const nextTs = upcoming[0].timestamp;
        candidates = upcoming.filter((s) => s.timestamp === nextTs);
      }
    }

    // Best slot per spot (by score)
    const map = {};
    for (const slot of candidates) {
      const existing = map[slot.spotId];
      if (!existing || (slot.score?.value || 0) > (existing.forecastData.score || 0)) {
        map[slot.spotId] = {
          slot,
          forecastData: {
            score: slot.score?.value,
            speed: slot.speed,
            gust: slot.gust,
            direction: slot.direction,
            waveHeight: slot.waveHeight,
            wavePeriod: slot.wavePeriod,
            sport: slot.sport,
            timestamp: slot.timestamp,
          },
        };
      }
    }
    return map;
  }, [enrichedSlots, spotsMap]);

  const handleWebcamClick = (webcam) => setFocusedWebcam(webcam);
  const handleCloseFullscreen = () => setFocusedWebcam(null);
  const handleNavigateWebcam = (webcam) => setFocusedWebcam(webcam);

  return (
    <MainLayout>
      <Header />

      {/* Filter bar — always in normal document flow, never overlaying cams */}
      {!loading && <div className="pb-4 pt-2">
        {filtersExpanded ? (
          /* Expanded: full filter bar, TV Mode hidden */
          <div className="rounded-xl bg-ink/[0.04] px-4 md:-mx-2 py-3">
            <div className="flex flex-col md:flex-row md:items-center md:gap-3">

              {/* Filters label */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setFiltersExpanded(false)}
                  className="flex items-center gap-1.5 text-faded-ink hover:text-ink transition-colors duration-fast ease-smooth"
                  aria-expanded={true}
                >
                  <SlidersHorizontal size={14} strokeWidth={2} aria-hidden="true" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Filters</span>
                </button>
                <div className="flex-1 md:hidden" />
                <button
                  onClick={() => setFiltersExpanded(false)}
                  className="md:hidden p-1 rounded-full text-faded-ink/50 hover:text-ink hover:bg-ink/[0.06] transition-colors"
                  aria-label="Close filters"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>

              {/* Vertical divider (desktop) */}
              <div className="hidden md:block w-px h-4 bg-ink/20 shrink-0" />

              {/* Sport filter */}
              <div className="flex flex-col md:flex-row md:items-center gap-3 mt-3 pt-3 border-t border-ink/[0.06] md:mt-0 md:pt-0 md:border-0 flex-1">
                <FilterGroup label="Sport">
                  <PillToggle
                    name="sport"
                    options={[
                      { id: "", label: "All" },
                      { id: "wingfoil", label: "Wing" },
                      { id: "kitesurfing", label: "Kite" },
                      { id: "surfing", label: "Surf" },
                    ]}
                    value={selectedSport}
                    onChange={setSelectedSport}
                  />
                </FilterGroup>
              </div>

              {/* X (desktop) */}
              <button
                onClick={() => setFiltersExpanded(false)}
                className="hidden md:flex p-1 rounded-full text-faded-ink/50 hover:text-ink hover:bg-ink/[0.06] transition-colors"
                aria-label="Close filters"
              >
                <X size={14} strokeWidth={2} />
              </button>

            </div>
          </div>
        ) : (
          /* Collapsed: [TV Mode] [Filter pill] right-aligned */
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setTvMode(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink/[0.05] text-faded-ink hover:text-ink transition-colors duration-fast ease-smooth"
              aria-label="TV Mode"
            >
              <Tv size={14} strokeWidth={2} />
              <span className="text-xs font-semibold uppercase tracking-wider leading-none">TV Mode</span>
            </button>

            <button
              onClick={() => setFiltersExpanded(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink/[0.05] text-faded-ink hover:text-ink transition-colors duration-fast ease-smooth"
              aria-expanded={false}
            >
              <SlidersHorizontal size={14} strokeWidth={2} aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wider leading-none">
                {sportLabel}
              </span>
            </button>
          </div>
        )}
      </div>}

      {/* Webcam grid */}
      <div className="pb-12">
        {loading ? (
          <Loader />
        ) : webcams.length === 0 ? (
          <EmptyState message="No webcams available" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {webcams.map((webcam) => (
              <div
                key={webcam._id}
                onClick={() => handleWebcamClick(webcam)}
                className="cursor-pointer group"
              >
                <WebcamCard
                  spot={webcam}
                  showHoverButtons
                  isFavorite={favoriteSpots.includes(webcam._id)}
                  onToggleFavorite={(e) => handleToggleFavorite(webcam._id, e)}
                  forecastData={forecastBySpot[webcam._id]?.forecastData || null}
                  onScoreClick={forecastBySpot[webcam._id]?.slot?.score ? () => setScoreModalSlot(forecastBySpot[webcam._id].slot) : undefined}
                />
              </div>
            ))}

            {/* Request a Spot tile */}
            <Link
              href="/request-spot"
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink/15 hover:border-ink/30 bg-ink/[0.02] hover:bg-ink/[0.04] transition-colors duration-fast ease-smooth py-6 md:flex-col md:py-0 md:min-h-[200px]"
            >
              <MapPin size={18} className="text-faded-ink/50" />
              <span className="text-xs font-semibold uppercase tracking-wider text-faded-ink/50">
                Request a Spot
              </span>
            </Link>
          </div>
        )}
      </div>

      {/* Fullscreen webcam modal */}
      {focusedWebcam && (
        <WebcamFullscreen
          spot={focusedWebcam}
          onClose={handleCloseFullscreen}
          allWebcams={webcams}
          onNavigate={handleNavigateWebcam}
        />
      )}

      {/* TV Mode */}
      {tvMode && (
        <TvMode
          webcams={webcams}
          onClose={() => setTvMode(false)}
        />
      )}

      {/* Score Modal */}
      {scoreModalSlot && scoreModalSlot.score && (
        <ScoreModal
          isOpen={true}
          onClose={() => setScoreModalSlot(null)}
          score={scoreModalSlot.score}
          slot={scoreModalSlot}
          spotName={spotsMap[scoreModalSlot.spotId]?.name || ""}
        />
      )}

    </MainLayout>
  );
}
