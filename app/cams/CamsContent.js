"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { Loader } from "../../components/common/Loader";
import { EmptyState } from "../../components/common/EmptyState";
import { useFlag } from "../../components/flags/FlagProvider";
import { SportFilterChip } from "../../components/sport/SportFilterChip";
import { Badge } from "../../components/ui/Badge";
import { SpotPicker, FAVORITES } from "../../components/next/SpotPicker";
import { riderCount as fixtureRiderCount } from "../../lib/fixtures/riderCounts";
import { WebcamCard } from "../../components/webcam/WebcamCard";
import { WebcamFullscreen } from "../../components/webcam/WebcamFullscreen";
import { TvMode } from "../../components/webcam/TvMode";
import { useAuth, useUser } from "../../components/auth/AuthProvider";
import { Tv, MapPin, SlidersHorizontal, Users, X } from "lucide-react";
import { FilterGroup } from "../../components/ui/FilterGroup";
import { SportFilter, ALL_SPORT_IDS } from "../../components/ui/SportFilter";
import { usePersistedState } from "../../lib/hooks/usePersistedState";
import { enrichSlots } from "../../lib/slots";
import { isDaylightSlot, isAfterSunset, isNighttimeSlot } from "../../lib/daylight";
import { ScoreModal } from "../../components/common/ScoreModal";
import Link from "next/link";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const CAMS_SCOPE_STORAGE_KEY = "waterman_cams_scope";

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

  const showRiderCounts = useFlag("riderCounts");

  // Same scope model as Next, and persisted, so the two screens agree about
  // what "mine" means and the choice survives a refresh.
  const [scope, setScope] = usePersistedState(
    CAMS_SCOPE_STORAGE_KEY,
    FAVORITES,
    (v) => typeof v === "string"
  );

  const [webcams, setWebcams] = useState(() => buildInitialWebcams(initialData));
  const [enrichedSlots, setEnrichedSlots] = useState(() => buildInitialSlots(initialData));
  const [spotsMap, setSpotsMap] = useState(() => buildInitialSpotsMap(initialData));
  const [loading, setLoading] = useState(!initialData);
  const [focusedWebcam, setFocusedWebcam] = useState(null);
  const [favoriteSpots, setFavoriteSpots] = useState([]);
  const [scoreModalSlot, setScoreModalSlot] = useState(null);
  const [tvMode, setTvMode] = useState(false);
  const [selectedSports, setSelectedSports] = usePersistedState(
    "waterman_cams_sports",
    [],
    (val) => Array.isArray(val) && val.every((s) => ALL_SPORT_IDS.includes(s))
  );
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const handleSportToggle = (sportId) => {
    setSelectedSports((prev) => {
      if (prev.includes(sportId)) {
        return prev.filter((s) => s !== sportId);
      } else {
        return [...prev, sportId];
      }
    });
  };

  const sportLabels = { wingfoil: "Wing", kitesurfing: "Kite", surfing: "Surf" };
  const activeFilterLabel = selectedSports.length === 0 || selectedSports.length === ALL_SPORT_IDS.length
    ? "All"
    : selectedSports.map((s) => sportLabels[s]).join(", ");

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
        const sports = selectedSports.length > 0 ? selectedSports : userSports;
        const usePersonalizedScores = user && user.showPersonalizedScores !== false;

        const camsData = await client.query(api.spots.getCamsData, {
          sports,
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
          const relevantSports = spotSports.filter((s) => sports.includes(s));
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSports.join(","), user]);

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

  /**
   * Sorted by who is actually out, not alphabetically — a cam with nobody on it
   * is information too, it just belongs further down.
   *
   * The whole organising principle of this screen is flag-dependent, so both
   * orderings have to look deliberate. With riderCounts off we keep the
   * existing order rather than inventing a different one.
   */
  const countsUpdatedAt = showRiderCounts
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Lisbon",
      }).format(new Date())
    : null;

  const favoriteIds = user?.favoriteSpots ?? [];
  const hasFavorites = favoriteIds.length > 0;

  // Scope first, then order. Falls back to everything when the rider has no
  // favourites, or when none of them have a cam — an empty grid would look
  // broken where the full list merely looks unfiltered.
  const scopedWebcams =
    scope === FAVORITES && hasFavorites
      ? (() => {
          const mine = webcams.filter((w) => favoriteIds.includes(w._id));
          return mine.length ? mine : webcams;
        })()
      : webcams;

  const orderedWebcams = showRiderCounts
    ? [...scopedWebcams].sort((a, b) => {
        const countOf = (cam) => fixtureRiderCount(cam._id)?.count ?? -1;
        return countOf(b) - countOf(a);
      })
    : scopedWebcams;
  const handleCloseFullscreen = () => setFocusedWebcam(null);
  const handleNavigateWebcam = (webcam) => setFocusedWebcam(webcam);

  return (
    <MainLayout>
      {/* "Who's out" — the screen is about who is on the water, not about
          listing cameras. The disclaimer sits directly under the title because
          the counts are estimates and must never read as measurements. */}
      <header className="flex items-center justify-between pt-[22px] pb-3">
        <h1 className="font-headline font-extrabold text-[25px] tracking-display-tight text-ink">
          {showRiderCounts ? "Who's out" : "Cams"}
        </h1>
        <div className="flex items-center gap-2">
          <SpotPicker
            spots={[]}
            value={scope}
            onChange={setScope}
            hasFavorites={hasFavorites}
          />
          <button
            onClick={() => setTvMode(true)}
            className="flex items-center gap-1.5 border border-nav-border rounded-pill px-[11px] py-1.5 font-data text-[10px] text-faded-ink hover:text-ink transition-colors duration-fast ease-smooth focus-ring"
            aria-label="TV Mode"
          >
            <Tv size={12} />
            TV
          </button>
          <SportFilterChip />
        </div>
      </header>

      {showRiderCounts && (
        <p className="font-data text-[9px] text-dim pb-3">
          RIDER COUNTS ESTIMATED FROM CAM FOOTAGE
          {countsUpdatedAt ? ` · UPDATED ${countsUpdatedAt}` : ""}
        </p>
      )}

      {/* Webcam grid */}
      <div className="pb-12">
        {loading ? (
          <Loader />
        ) : webcams.length === 0 ? (
          <EmptyState message="No webcams available" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {orderedWebcams.map((webcam) => (
              <div
                key={webcam._id}
                onClick={() => handleWebcamClick(webcam)}
                className={`relative h-full cursor-pointer group rounded-card overflow-hidden ${
                  showRiderCounts && (fixtureRiderCount(webcam._id)?.count ?? 0) > 0
                    ? "ring-1 ring-inset ring-accent-border"
                    : ""
                }`}
              >
                <WebcamCard
                  spot={webcam}
                  showHoverButtons
                  isFavorite={favoriteSpots.includes(webcam._id)}
                  onToggleFavorite={(e) => handleToggleFavorite(webcam._id, e)}
                  forecastData={forecastBySpot[webcam._id]?.forecastData || null}
                  onScoreClick={forecastBySpot[webcam._id]?.slot?.score ? () => setScoreModalSlot(forecastBySpot[webcam._id].slot) : undefined}
                  overlayBadge={
                    showRiderCounts ? (
                      <RiderBadge reading={fixtureRiderCount(webcam._id)} />
                    ) : null
                  }
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
          score={forecastBySpot[focusedWebcam._id]?.forecastData?.score ?? null}
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

/**
 * The four states from the handoff, in one badge.
 *
 *   active   — solid accent, count leading
 *   quieter  — neutral fill, count leading
 *   nobody   — "NOBODY OUT" in muted text. A real answer, not an empty state.
 *   no data  — nothing rendered, which is different again from nobody out
 */
function RiderBadge({ reading }) {
  if (!reading) return null;

  // Icon and number only. The noun was doing no work — the users glyph already
  // says these are people, and it had to degrade to a vague "OUT" whenever the
  // sport filter held more than one sport.
  //
  // Zero still gets words: "0" beside a person icon reads as a missing value,
  // where "NOBODY OUT" is the answer.
  const empty = reading.count === 0;

  return (
    <Badge variant={reading.count >= 5 ? "live" : "overlay"}>
      <Users size={11} />
      {empty ? "NOBODY OUT" : reading.count}
    </Badge>
  );
}
