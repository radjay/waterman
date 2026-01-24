"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { MainLayout } from "../components/layout/MainLayout";
import { Header, AuthButton } from "../components/layout/Header";
import { SportSelector } from "../components/layout/SportSelector";
import { ShowFilter } from "../components/layout/ShowFilter";
import { EmptyState } from "../components/common/EmptyState";
import { Loader } from "../components/common/Loader";
import { DaySection } from "../components/forecast/DaySection";
import { Footer } from "../components/layout/Footer";
import { formatDate, formatFullDay, formatTideTime } from "../lib/utils";
import { enrichSlots, filterAndSortDays, markIdealSlots } from "../lib/slots";
import { usePersistedState } from "../lib/hooks/usePersistedState";
import { useAuth, useUser } from "../components/auth/AuthProvider";
import { ListFilter } from "lucide-react";
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
    (val) => val === "wingfoil" || val === "surfing"
  );

  // Use user's favorite sports if authenticated, otherwise use local state
  // If user has multiple favorite sports, use the first one
  const selectedSport = useMemo(() => {
    if (user && user.favoriteSports && user.favoriteSports.length > 0) {
      return user.favoriteSports[0];
    }
    return localSelectedSport;
  }, [user, localSelectedSport]);

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
          const scoresPromises = relevantSports.map((sport) =>
            client.query(api.spots.getConditionScores, {
              spotId: spot._id,
              sport: sport,
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
          
          // Create a map of slotId -> score for quick lookup
          const scoresMap = {};
          scoresArrays.forEach((scores, index) => {
            const sport = relevantSports[index];
            scores.forEach((score) => {
              // Map by slotId and sport (since multiple sports can have scores for same slot)
              const key = `${score.slotId}_${sport}`;
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
  // "all" shows all slots regardless of score
  const filteredSlots =
    showFilter === "best"
      ? allSlots.filter((slot) => {
          // Show slots with score >= 60 (good conditions per PRD 02)
          if (slot.score && slot.score.value >= 60) return true;
          // Always show tide-only entries
          if (slot.isTideOnly) return true;
          return false;
        })
      : allSlots; // "all" shows all slots

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

  // Filter out past dates and sort days chronologically
  const sortedDays = filterAndSortDays(grouped);

  // Sort slots within each spot group and identify ideal slot
  // Only mark as ideal if the slot matches criteria
  markIdealSlots(grouped, selectedSports);

  // Handle view toggle - navigate to different views
  const handleViewChange = (view) => {
    if (view === "calendar") {
      router.push("/calendar");
    } else if (view === "cams") {
      router.push("/cams");
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
      {/* Portrait mobile: tabs with auth button, then filters on next row */}
      {/* Landscape mobile & Desktop: tabs and filters on same row, auth in header */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Row 1: Tabs + Auth (portrait mobile) OR Tabs + Filters (landscape/desktop) */}
        <div className="flex items-center justify-between gap-2 md:gap-4">
          <ViewToggle onChange={handleViewChange} className="flex-shrink-0" />
          
          {/* Auth button - shown on portrait mobile only, always hidden on desktop */}
          <div className="hidden max-md:portrait:block">
            <AuthButton />
          </div>
          
          {/* Filters - shown on landscape mobile and desktop */}
          <div className="hidden md:flex max-md:landscape:flex items-center gap-2">
            <ListFilter size={18} className="text-ink" />
            <SportSelector
              value={selectedSport}
              onSportsChange={handleSportChange}
            />
            <ShowFilter value={showFilter} onFilterChange={setShowFilter} />
          </div>
        </div>
        
        {/* Row 2: Filters (portrait mobile only, always hidden on desktop) */}
        <div className="hidden max-md:portrait:flex items-center gap-2">
          <ListFilter size={18} className="text-ink" />
          <SportSelector
            value={selectedSport}
            onSportsChange={handleSportChange}
          />
          <ShowFilter value={showFilter} onFilterChange={setShowFilter} />
        </div>
      </div>

      {loading ? (
            <Loader />
          ) : sortedDays.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-8">
              {sortedDays.map((day) => {
            const dayData = grouped[day];
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
                  <div className="font-headline text-[1.26rem] font-bold border-b-2 border-ink mb-3 pb-1 text-ink pl-2">
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
                  />
                );
              })}
            </div>
          )}

      <Footer mostRecentScrapeTimestamp={mostRecentScrapeTimestamp} />
    </MainLayout>
  );
}
