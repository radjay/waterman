"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { MainLayout } from "../../../components/layout/MainLayout";
import { Header } from "../../../components/layout/Header";
import { SportSelector } from "../../../components/layout/SportSelector";
import { ShowFilter } from "../../../components/layout/ShowFilter";
import { EmptyState } from "../../../components/common/EmptyState";
import { Loader } from "../../../components/common/Loader";
import { DaySection } from "../../../components/forecast/DaySection";
import { Footer } from "../../../components/layout/Footer";
import { formatDate, formatFullDay, formatTideTime } from "../../../lib/utils";
import { enrichSlots, filterAndSortDays, markIdealSlots } from "../../../lib/slots";
import { useUser } from "../../../components/auth/AuthProvider";
import { ListFilter, SlidersHorizontal } from "lucide-react";
import { ViewToggle } from "../../../components/layout/ViewToggle";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

// Map URL sport values to internal sport values
const sportMap = {
  wing: "wingfoil",
  surf: "surfing",
};

// Map internal sport values to URL sport values
const reverseSportMap = {
  wingfoil: "wing",
  surfing: "surf",
};

function SportFilterPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useUser();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
  // Get highlighted day and slot from URL params
  const highlightedDay = searchParams?.get("day") || null;
  const highlightedSlot = searchParams?.get("slot") || null;
  
  // Extract sport and filter from URL params
  const urlSport = params.sport?.toLowerCase();
  const urlFilter = params.filter?.toLowerCase();

  // Map URL sport to internal sport value, default to wingfoil if invalid
  const selectedSport = useMemo(() => {
    if (urlSport && sportMap[urlSport]) {
      return sportMap[urlSport];
    }
    return "wingfoil";
  }, [urlSport]);

  // Validate and use filter from URL, default to best if invalid
  const showFilter = useMemo(() => {
    if (urlFilter === "all" || urlFilter === "best") {
      return urlFilter;
    }
    return "best";
  }, [urlFilter]);

  // Convert single sport to array format (used throughout the app)
  const selectedSports = useMemo(() => [selectedSport], [selectedSport]);

  // Handle sport change from SportSelector (navigate to new URL)
  const handleSportChange = (sportId) => {
    const urlSportValue = reverseSportMap[sportId] || "wing";
    router.push(`/${urlSportValue}/${showFilter}`);
  };

  // Handle filter change (navigate to new URL)
  const handleFilterChange = (filterValue) => {
    const urlSportValue = reverseSportMap[selectedSport] || "wing";
    router.push(`/${urlSportValue}/${filterValue}`);
  };

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
        const tidesBySpot = {};
        allFetchedData.forEach((data, index) => {
          const spot = fetchedSpots[index];
          if (data.tides && data.tides.length > 0) {
            tidesBySpot[spot._id] = {
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
        setTidesBySpot(tidesBySpot);

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

  // Scroll to highlighted day and slot when they change
  useEffect(() => {
    if (highlightedDay && !loading) {
      // Wait for DOM to be ready, with retries if element isn't found immediately
      const scrollToDay = () => {
        const dayElement = document.getElementById(`day-${encodeURIComponent(highlightedDay)}`);
        if (dayElement) {
          // Use a small additional delay to ensure layout is stable
          setTimeout(() => {
            dayElement.scrollIntoView({ behavior: "smooth", block: "start" });
            
            // If there's a specific slot to scroll to, scroll to it after scrolling to the day
            if (highlightedSlot) {
              setTimeout(() => {
                const slotElement = document.getElementById(highlightedSlot) || 
                                  document.querySelector(`[id*="${highlightedSlot}"]`);
                if (slotElement) {
                  slotElement.scrollIntoView({ behavior: "smooth", block: "center" });
                  // Highlight the slot briefly
                  slotElement.style.transition = "background-color 0.3s";
                  const originalBg = slotElement.style.backgroundColor;
                  slotElement.style.backgroundColor = "rgba(59, 130, 246, 0.3)";
                  setTimeout(() => {
                    slotElement.style.backgroundColor = originalBg;
                  }, 2000);
                }
              }, 500);
            }
            
            // Remove the day and slot params from URL after scrolling
            setTimeout(() => {
              const urlSportValue = reverseSportMap[selectedSport] || "wing";
              router.push(`/${urlSportValue}/${showFilter}`, { scroll: false });
            }, 2000);
          }, 200);
        } else {
          // Retry after a short delay if element not found
          setTimeout(scrollToDay, 100);
        }
      };
      
      // Initial delay to ensure content is rendered
      setTimeout(scrollToDay, 300);
    }
  }, [highlightedDay, highlightedSlot, loading, router, selectedSport, showFilter]);

  // Handle view toggle - navigate to different views
  const handleViewChange = (view) => {
    if (view === "calendar") {
      router.push("/calendar");
    } else if (view === "cams") {
      router.push("/cams");
    } else {
      // Navigate to report view (main page)
      router.push("/");
    }
  };

  return (
    <MainLayout>
      <Header />
      {/* Tabs + filters bar - sticky on desktop */}
      <div className="md:sticky md:top-[57px] md:z-40 bg-newsprint md:border-b md:border-ink/20 py-3 md:py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-2">
          {/* Tabs row with filter toggle on mobile */}
          <div className="flex items-center justify-between md:justify-start">
            <ViewToggle onChange={handleViewChange} />
            {/* Mobile filter toggle button */}
            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className={`md:hidden px-2 py-1 rounded border border-ink/30 transition-colors ${
                mobileFiltersOpen ? "bg-ink text-newsprint" : "bg-newsprint text-ink hover:bg-ink/5"
              }`}
              aria-label="Toggle filters"
              aria-expanded={mobileFiltersOpen}
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>
          
          {/* Filters row - hidden on mobile by default, shown when expanded */}
          <div className={`${mobileFiltersOpen ? "flex" : "hidden"} md:flex items-center gap-2`}>
            <ListFilter size={18} className="text-ink" />
            <SportSelector
              value={selectedSport}
              onSportsChange={handleSportChange}
            />
            <ShowFilter value={showFilter} onFilterChange={handleFilterChange} />
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

export default function SportFilterPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <Loader />
        </div>
        <Footer />
      </MainLayout>
    }>
      <SportFilterPageContent />
    </Suspense>
  );
}

