"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { MainLayout } from "../components/layout/MainLayout";
import { Header } from "../components/layout/Header";
import { EmptyState } from "../components/common/EmptyState";
import { Loader } from "../components/common/Loader";
import { DaySection } from "../components/forecast/DaySection";
import { Footer } from "../components/layout/Footer";
import { formatDate, formatFullDay, formatTideTime } from "../lib/utils";
import { enrichSlots, filterAndSortDays, markIdealSlots, markContextualSlots } from "../lib/slots";
import { isDaylightSlot, isContextualSlot, isAfterSunset, isNighttimeSlot } from "../lib/daylight";
import { usePersistedState } from "../lib/hooks/usePersistedState";
import { useAuth, useUser } from "../components/auth/AuthProvider";
import { PillToggle } from "../components/ui/PillToggle";
import { FilterGroup } from "../components/ui/FilterGroup";
import { FilterBar } from "../components/ui/FilterBar";
import { Heading } from "../components/ui/Heading";
import { Text } from "../components/ui/Text";
import { useOnboarding } from "../hooks/useOnboarding";
import { OnboardingModal } from "../components/onboarding/OnboardingModal";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessionToken } = useAuth();
  const user = useUser();

  // Onboarding state (skip for authenticated users)
  const { needsOnboarding, isLoading: onboardingLoading, markOnboardingComplete } = useOnboarding(user);

  // Use persisted state hook for sport selection (fallback for anonymous users)
  const [localSelectedSport, setLocalSelectedSport] = usePersistedState(
    "waterman_selected_sport",
    "wingfoil",
    (val) => val === "wingfoil" || val === "kitesurfing" || val === "surfing"
  );

  // Track if we've synced with user's favorite sports (only sync once on initial load)
  const hasSyncedWithUser = useRef(false);

  // Sync localSelectedSport with user's favorite sports on initial load only
  // Don't reset if user explicitly selects a different sport
  useEffect(() => {
    if (!hasSyncedWithUser.current && user && user.favoriteSports && user.favoriteSports.length > 0) {
      const userSport = user.favoriteSports[0];
      // Only sync if different from current selection
      if (userSport !== localSelectedSport) {
        setLocalSelectedSport(userSport);
      }
      hasSyncedWithUser.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]); // Only run when user ID changes (initial load or user change)

  // Always use localSelectedSport as the source of truth for immediate UI updates
  // This ensures the UI updates immediately when the user changes the sport
  const selectedSport = localSelectedSport;

  // Convert single sport to array format (used throughout the app)
  // Memoize to prevent infinite loops in useEffect dependencies
  const selectedSports = useMemo(() => [selectedSport], [selectedSport]);

  // Handle sport change from SportSelector
  const handleSportChange = async (sportId) => {
    // Always update local state immediately for responsive UI
    setLocalSelectedSport(sportId);
    
    // If user is authenticated, also save to server
    if (sessionToken && user) {
      try {
        await client.mutation(api.auth.updatePreferences, {
          sessionToken,
          favoriteSports: [sportId],
        });
      } catch (error) {
        console.error("Failed to save sport preference:", error);
      }
    }
  };

  // Use persisted state hook for filter
  const [showFilter, setShowFilter] = usePersistedState(
    "waterman_show_filter",
    "best",
    (val) => val === "best" || val === "all"
  );

  // Get highlighted day from URL params
  const highlightedDay = searchParams?.get("day") || null;
  const [spots, setSpots] = useState([]);
  const [allSlots, setAllSlots] = useState([]);
  const [spotsMap, setSpotsMap] = useState({}); // Map spotId to spot data
  const [tidesBySpot, setTidesBySpot] = useState({}); // Map spotId to tides data
  const [loading, setLoading] = useState(true);
  const [mostRecentScrapeTimestamp, setMostRecentScrapeTimestamp] =
    useState(null);


  // Fetch spots and data using batched query
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Single batched query: fetches spots, slots, configs, scores, tides, and scrape timestamp
        const usePersonalizedScores = user && user.showPersonalizedScores !== false;
        const reportData = await client.query(api.spots.getReportData, {
          sports: selectedSports,
          userId: usePersonalizedScores && user?._id ? user._id : undefined,
        });

        const fetchedSpots = reportData.spots;

        // Order spots: favorites first for authenticated users
        let orderedSpots = fetchedSpots;
        if (user && user.favoriteSpots && user.favoriteSpots.length > 0) {
          const favoriteSpotIds = new Set(user.favoriteSpots);
          orderedSpots = [
            ...fetchedSpots.filter((spot) => favoriteSpotIds.has(spot._id)),
            ...fetchedSpots.filter((spot) => !favoriteSpotIds.has(spot._id)),
          ];
        }

        setSpots(orderedSpots);

        // Create a map of spotId to spot data for easy lookup
        const spotsMapObj = {};
        fetchedSpots.forEach((spot) => {
          spotsMapObj[spot._id] = spot;
        });
        setSpotsMap(spotsMapObj);

        // Enrich slots client-side using batched data
        const allFetchedSlots = [];
        const tidesBySpotObj = {};

        for (const spot of fetchedSpots) {
          const spotData = reportData.data[spot._id];
          if (!spotData) continue;

          const spotSports = spot.sports && spot.sports.length > 0 ? spot.sports : ["wingfoil"];
          const relevantSports = spotSports.filter((s) => selectedSports.includes(s));
          const configs = Object.values(spotData.configs);

          if (spotData.slots) {
            const enrichedSlots = enrichSlots(spotData.slots, spot, configs, spotData.scoresMap, relevantSports);
            allFetchedSlots.push(...enrichedSlots);
          }

          if (spotData.tides && spotData.tides.length > 0) {
            tidesBySpotObj[spot._id] = {
              spotName: spot.name,
              tides: spotData.tides.map((tide) => ({
                time: tide.time,
                type: tide.type,
                height: tide.height,
                timeStr: formatTideTime(new Date(tide.time)),
              })),
            };
          }
        }

        setAllSlots(allFetchedSlots);
        setTidesBySpot(tidesBySpotObj);
        setMostRecentScrapeTimestamp(reportData.mostRecentScrapeTimestamp);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedSports, user]);

  // Filter slots based on showFilter
  // "best" shows slots with scores >= 60 (good conditions per PRD 02)
  // "all" shows all slots regardless of score (but still filtered by daylight later)
  // Note: Daylight filtering always applies regardless of showFilter setting
  const filteredSlots =
    showFilter === "best"
      ? allSlots.filter((slot) => {
          // Show slots with score >= 60 (good conditions per PRD 02)
          if (slot.score && slot.score.value >= 60) return true;
          // Always show tide-only entries
          if (slot.isTideOnly) return true;
          return false;
        })
      : allSlots; // "all" shows all slots (daylight filtering happens later)

  // Group by Date, then by Spot
  // Separate tide-only entries to include in tide section
  const grouped = filteredSlots.reduce((acc, slot) => {
    const dateObj = new Date(slot.timestamp);
    const dayStr = formatDate(dateObj);

    if (!acc[dayStr]) acc[dayStr] = {};

    // Group by spotId (both forecast slots and tide-only entries have spotId)
    if (slot.spotId) {
      if (!acc[dayStr][slot.spotId]) acc[dayStr][slot.spotId] = [];
      acc[dayStr][slot.spotId].push(slot);
    }
    return acc;
  }, {});

  // Mark contextual slots (needs all slots for the day)
  // Use existing spotsMap state variable
  markContextualSlots(grouped, spotsMap, selectedSports);

  // Filter grouped slots to only show daylight + contextual slots
  const filteredGrouped = {};
  Object.keys(grouped).forEach(day => {
    filteredGrouped[day] = {};
    Object.keys(grouped[day]).forEach(spotId => {
      if (spotId === '_tides') {
        // Keep tide entries as-is
        filteredGrouped[day][spotId] = grouped[day][spotId];
        return;
      }
      
      const spot = spotsMap[spotId];
      if (!spot) {
        filteredGrouped[day][spotId] = grouped[day][spotId];
        return;
      }

      // Filter to daylight slots + contextual slots
      // Always exclude nighttime slots regardless of showFilter setting
      // BUT: Keep all slots for today regardless of whether they're in the past
      const isToday = day === formatDate(new Date());

      filteredGrouped[day][spotId] = grouped[day][spotId].filter(slot => {
        // Always show tide-only slots
        if (slot.isTideOnly) return true;

        // Always exclude clearly nighttime slots (10 PM - 6 AM) as a safety check
        if (isNighttimeSlot(new Date(slot.timestamp))) return false;

        // Show contextual slots (these are special cases)
        if (slot.isContextual) return true;

        // For today: show all daylight slots regardless of current time
        // For future days: only show slots that haven't happened yet
        const isDaylight = isDaylightSlot(new Date(slot.timestamp), spot);
        const afterSunset = isAfterSunset(new Date(slot.timestamp), spot);

        // Only show if it's daylight AND not after sunset
        // (isDaylight should already exclude after-sunset, but double-check for safety)
        if (isDaylight && !afterSunset) return true;

        // Filter out everything else (including slots after sunset that aren't contextual)
        return false;
      });
    });
  });

  // Filter out past dates and sort days chronologically
  const sortedDays = filterAndSortDays(filteredGrouped);

  // Sort slots within each spot group and identify ideal slot
  // Only mark as ideal if the slot matches criteria (excludes contextual slots and slots after sunset)
  markIdealSlots(filteredGrouped, selectedSports, spotsMap);

  // Scroll to highlighted day when it changes
  useEffect(() => {
    if (highlightedDay) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById(`day-${encodeURIComponent(highlightedDay)}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          // Remove the day param from URL after scrolling
          setTimeout(() => {
            router.push("/", { scroll: false });
          }, 2000);
        }
      }, 100);
    }
  }, [highlightedDay, router]);

  return (
    <>
      {/* Show onboarding modal on first visit (non-dismissible on homepage) */}
      {!onboardingLoading && needsOnboarding && (
        <OnboardingModal
          onComplete={markOnboardingComplete}
          isDismissible={false}
        />
      )}

      <MainLayout>
        <Header />

        {/* Filters — "set and forget" */}
        <FilterBar activeFilters={[
          { wingfoil: "Wing", kitesurfing: "Kite", surfing: "Surf" }[selectedSport],
          { best: "Best", all: "All" }[showFilter],
        ].filter(Boolean)}>
          <FilterGroup label="Sport">
            <PillToggle
              name="sport"
              options={[
                { id: "wingfoil", label: "Wing" },
                { id: "kitesurfing", label: "Kite" },
                { id: "surfing", label: "Surf" },
              ]}
              value={selectedSport}
              onChange={handleSportChange}
            />
          </FilterGroup>
          <FilterGroup label="Conditions">
            <PillToggle
              name="show"
              options={[
                { id: "best", label: "Best" },
                { id: "all", label: "All" },
              ]}
              value={showFilter}
              onChange={setShowFilter}
            />
          </FilterGroup>
        </FilterBar>

      {loading ? (
            <Loader />
          ) : sortedDays.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-8 md:mt-2">
              {sortedDays.map((day) => {
            const dayData = filteredGrouped[day];
            // Check if there are any forecast slots (not just tide-only entries)
            const hasForecastSlots = Object.keys(dayData).some((spotId) => {
              if (spotId === "_tides") return false;
              const slots = dayData[spotId] || [];
              return slots.some((slot) => !slot.isTideOnly);
            });

            if (!hasForecastSlots) {
              // Get the actual date from any slot (including tide-only) to format properly
              const getFormattedDay = () => {
                // Try to find any slot with a timestamp
                for (const spotId of Object.keys(dayData)) {
                  if (spotId === "_tides") continue;
                  const slots = dayData[spotId] || [];
                  if (slots.length > 0) {
                    const firstSlot = slots[0];
                    if (firstSlot && firstSlot.timestamp) {
                      return formatFullDay(firstSlot.timestamp);
                    }
                  }
                }
                // Try tide entries
                if (dayData._tides && dayData._tides.length > 0) {
                  const firstTide = dayData._tides[0];
                  if (firstTide && firstTide.tideTime) {
                    return formatFullDay(firstTide.tideTime);
                  }
                }
                // Parse the day string as fallback (format: "Mon, Dec 7")
                try {
                  const parts = day.split(", ");
                  if (parts.length === 2) {
                    const monthDay = parts[1].split(" ");
                    const monthNames = [
                      "Jan",
                      "Feb",
                      "Mar",
                      "Apr",
                      "May",
                      "Jun",
                      "Jul",
                      "Aug",
                      "Sep",
                      "Oct",
                      "Nov",
                      "Dec",
                    ];
                    const monthIndex = monthNames.indexOf(monthDay[0]);
                    if (monthIndex !== -1) {
                      const currentYear = new Date().getFullYear();
                      const dateObj = new Date(
                        currentYear,
                        monthIndex,
                        parseInt(monthDay[1])
                      );
                      return formatFullDay(dateObj);
                    }
                  }
                } catch (e) {
                  // If parsing fails, return original
                }
                // Final fallback to original format
                return day;
              };

              return (
                <div key={day} className="mb-4">
                  <div className="sticky top-0 md:top-[50px] bg-newsprint z-[9] flex items-center py-3 mb-2 pl-2">
                    <span className="text-sm font-semibold uppercase tracking-widest text-faded-ink">
                      {getFormattedDay()}
                    </span>
                  </div>
                  <div className="text-left py-8 ml-2">
                    <Heading level={2}>No conditions</Heading>
                  </div>
                </div>
              );
            }

                return (
                  <DaySection
                    key={day}
                    id={`day-${encodeURIComponent(day)}`}
                    day={day}
                    spotsData={dayData}
                    selectedSports={selectedSports}
                    spotsMap={spotsMap}
                    showFilter={showFilter}
                    tidesBySpot={tidesBySpot}
                    isHighlighted={highlightedDay === day}
                    isAuthenticated={!!sessionToken}
                  />
                );
              })}
            </div>
          )}

        {!loading && <Footer mostRecentScrapeTimestamp={mostRecentScrapeTimestamp} />}
      </MainLayout>
    </>
  );
}
