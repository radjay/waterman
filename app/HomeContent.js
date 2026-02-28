"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { MainLayout } from "../components/layout/MainLayout";
import { Header } from "../components/layout/Header";
import { SportSelector } from "../components/layout/SportSelector";
import { ShowFilter } from "../components/layout/ShowFilter";
import { EmptyState } from "../components/common/EmptyState";
import { Loader } from "../components/common/Loader";
import { DaySection } from "../components/forecast/DaySection";
import { Footer } from "../components/layout/Footer";
import { formatDate, formatFullDay, formatTideTime } from "../lib/utils";
import { enrichSlots, filterAndSortDays, markIdealSlots, markContextualSlots } from "../lib/slots";
import { isDaylightSlot, isContextualSlot, isAfterSunset, isNighttimeSlot } from "../lib/daylight";
import { usePersistedState } from "../lib/hooks/usePersistedState";
import { useAuth, useUser } from "../components/auth/AuthProvider";
import { ListFilter, SlidersHorizontal } from "lucide-react";
import { ViewToggle } from "../components/layout/ViewToggle";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessionToken } = useAuth();
  const user = useUser();

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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Fetch spots filtered by selected sports
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch spots filtered by selected sports
        const fetchedSpots = await client.query(api.spots.list, {
          sports: selectedSports,
        });

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

        // Fetch forecasts for each spot
        const slotsPromises = fetchedSpots.map(async (spot) => {
          // Get configs for each sport this spot supports
          const spotSports =
            spot.sports && spot.sports.length > 0 ? spot.sports : ["wingfoil"]; // Default to wingfoil if no sports
          const relevantSports = spotSports.filter((s) =>
            selectedSports.includes(s)
          );

          const configPromises = relevantSports.map((sport) =>
            client.query(api.spots.getSpotConfig, {
              spotId: spot._id,
              sport: sport,
            })
          );

          // Fetch scores for each relevant sport
          // Use personalized scores if user is logged in and has showPersonalizedScores enabled
          const usePersonalizedScores = user && user.showPersonalizedScores !== false;
          const scoresPromises = relevantSports.map((sport) =>
            client.query(api.spots.getConditionScores, {
              spotId: spot._id,
              sport: sport,
              userId: usePersonalizedScores && user?._id ? user._id : undefined,
            })
          );

          // Fetch slots, tides, and configs in parallel
          const [slotsData, tidesData, ...configs] = await Promise.all([
            client.query(api.spots.getForecastSlots, { spotId: spot._id }),
            client.query(api.spots.getTides, { spotId: spot._id }),
            ...configPromises,
          ]);

          // Fetch scores separately (after slots are fetched)
          const scoresArrays = await Promise.all(scoresPromises);
          
          // Create a map of timestamp -> score for quick lookup
          // Using timestamp instead of slotId because slot IDs change with each scrape
          // but timestamps remain consistent for the same time period
          const scoresMap = {};
          scoresArrays.forEach((scores, index) => {
            const sport = relevantSports[index];
            scores.forEach((score) => {
              // Map by timestamp and sport (slot IDs change between scrapes)
              const key = `${score.timestamp}_${sport}`;
              scoresMap[key] = score;
            });
          });

          if (!slotsData) return { slots: [], tides: tidesData || [] };

          const enrichedSlots = enrichSlots(slotsData, spot, configs, scoresMap, relevantSports);

          return { slots: enrichedSlots, tides: tidesData || [] };
        });

        const allFetchedData = await Promise.all(slotsPromises);
        const allFetchedSlots = allFetchedData.map(d => d.slots).flat();
        
        // Collect tides by spot
        const tidesBySpotObj = {};
        allFetchedData.forEach((data, index) => {
          const spot = fetchedSpots[index];
          if (data.tides && data.tides.length > 0) {
            tidesBySpotObj[spot._id] = {
              spotName: spot.name,
              tides: data.tides.map(tide => ({
                time: tide.time,
                type: tide.type,
                height: tide.height,
                timeStr: formatTideTime(new Date(tide.time)),
              })),
            };
          }
        });

        // Include all slots (both forecast and tide-only) for grouping
        // Tide-only entries will be filtered out from display but used for tide matching
        setAllSlots(allFetchedSlots);
        
        // Store tides separately
        setTidesBySpot(tidesBySpotObj);

        // Fetch most recent scrape timestamp
        const scrapeTimestamp = await client.query(
          api.spots.getMostRecentScrapeTimestamp
        );
        setMostRecentScrapeTimestamp(scrapeTimestamp);
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

  // Handle view toggle - navigate to different views
  const handleViewChange = (view) => {
    if (view === "dashboard") {
      router.push("/dashboard");
    } else if (view === "calendar") {
      router.push("/calendar");
    } else if (view === "cams") {
      router.push("/cams");
    } else if (view === "sessions") {
      router.push("/journal");
    }
  };

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
    <MainLayout>
      <Header />
      {/* Tabs + filters bar - sticky, scrollable on mobile */}
      <div className="sticky top-[57px] z-40 bg-newsprint border-b border-ink/20 py-3 md:py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-2 px-4">
          {/* Tabs row with filter toggle on mobile */}
          <div className="flex items-center justify-between md:justify-start overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            <ViewToggle onChange={handleViewChange} />
            {/* Mobile filter toggle button */}
            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className={`md:hidden h-7 w-7 flex items-center justify-center rounded border border-ink/30 transition-colors ${
                mobileFiltersOpen ? "bg-ink text-newsprint" : "bg-newsprint text-ink hover:bg-ink/5"
              }`}
              aria-label="Toggle filters"
              aria-expanded={mobileFiltersOpen}
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>
          
          {/* Filters row - hidden on mobile by default, shown when expanded */}
          <div className={`${mobileFiltersOpen ? "flex" : "hidden"} md:flex items-center gap-2`}>
            <ListFilter size={18} className="text-ink" />
            <SportSelector
              value={selectedSport}
              onSportsChange={handleSportChange}
            />
            <ShowFilter value={showFilter} onFilterChange={setShowFilter} />
          </div>
        </div>
      </div>
      <div className="h-4" /> {/* Spacer below tabs */}

      {loading ? (
            <Loader />
          ) : sortedDays.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-8">
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
                  <div className="font-headline text-[1.26rem] font-bold border-b-2 border-ink mb-3 pb-1 sticky top-[48px] md:top-[113px] pt-[13px] md:pt-[23px] bg-newsprint z-[9] text-ink pl-2">
                    {getFormattedDay()}
                  </div>
                  <div className="text-left py-8 font-headline text-xl text-ink ml-2">
                    No conditions
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

      <Footer mostRecentScrapeTimestamp={mostRecentScrapeTimestamp} />
    </MainLayout>
  );
}
