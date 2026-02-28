"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { CalendarView } from "../../components/calendar/CalendarView";
import { Loader } from "../../components/common/Loader";
import { ViewToggle } from "../../components/layout/ViewToggle";
import { Footer } from "../../components/layout/Footer";
import { formatDate } from "../../lib/utils";
import { enrichSlots, filterAndSortDays, markIdealSlots, markContextualSlots } from "../../lib/slots";
import { isDaylightSlot, isAfterSunset, isNighttimeSlot } from "../../lib/daylight";
import { useUser } from "../../components/auth/AuthProvider";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function CalendarPage() {
  const router = useRouter();
  const user = useUser();

  // Calendar shows all sports, so we always fetch data for all three
  const selectedSports = useMemo(() => ["wingfoil", "kitesurfing", "surfing"], []);
  
  // Calendar always shows best conditions (score >= 60)
  const showFilter = "best";

  const [spots, setSpots] = useState([]);
  const [allSlots, setAllSlots] = useState([]);
  const [spotsMap, setSpotsMap] = useState({}); // Map spotId to spot data
  const [loading, setLoading] = useState(true);
  const [mostRecentScrapeTimestamp, setMostRecentScrapeTimestamp] =
    useState(null);

  // Fetch spots filtered by selected sports
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch all spots (calendar shows all sports)
        const fetchedSpots = await client.query(api.spots.list, {});

        setSpots(fetchedSpots);

        // Create a map of spotId to spot data for easy lookup
        const spotsMapObj = {};
        fetchedSpots.forEach((spot) => {
          spotsMapObj[spot._id] = spot;
        });
        setSpotsMap(spotsMapObj);

        // Fetch forecasts for each spot
        const slotsPromises = fetchedSpots.map(async (spot) => {
          // Get configs for each sport this spot supports (all sports for calendar)
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
        
        setAllSlots(allFetchedSlots);

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
  const filteredSlots =
    showFilter === "best"
      ? allSlots.filter((slot) => {
          if (slot.score && slot.score.value >= 60) return true;
          if (slot.isTideOnly) return true;
          return false;
        })
      : allSlots;

  // Group by Date, then by Spot
  const grouped = filteredSlots.reduce((acc, slot) => {
    const dateObj = new Date(slot.timestamp);
    const dayStr = formatDate(dateObj);

    if (!acc[dayStr]) acc[dayStr] = {};

    if (slot.spotId) {
      if (!acc[dayStr][slot.spotId]) acc[dayStr][slot.spotId] = [];
      acc[dayStr][slot.spotId].push(slot);
    }
    return acc;
  }, {});

  // Mark contextual slots (needs all slots for the day)
  markContextualSlots(grouped, spotsMap, selectedSports);

  // Filter grouped slots to only show daylight + contextual slots
  const filteredGrouped = {};
  Object.keys(grouped).forEach(day => {
    filteredGrouped[day] = {};
    Object.keys(grouped[day]).forEach(spotId => {
      const spot = spotsMap[spotId];
      if (!spot) {
        filteredGrouped[day][spotId] = grouped[day][spotId];
        return;
      }

      // Filter to daylight slots + contextual slots
      // Always exclude nighttime slots regardless of showFilter setting
      filteredGrouped[day][spotId] = grouped[day][spotId].filter(slot => {
        // Always show tide-only slots
        if (slot.isTideOnly) return true;
        
        // Always exclude clearly nighttime slots (10 PM - 6 AM) as a safety check
        if (isNighttimeSlot(new Date(slot.timestamp))) return false;
        
        // Show contextual slots (these are special cases)
        if (slot.isContextual) return true;
        
        // Show daylight slots (but not if they're after sunset)
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

  // Handle spot click from calendar view - navigate to sport-specific route
  const handleSpotClick = (sport, dayStr) => {
    // Map sport to URL format
    const urlSport = sport === "wingfoil" ? "wing" : "surf";
    // Navigate to sport route with "all" filter and day parameter for scrolling
    router.push(`/${urlSport}/all?day=${encodeURIComponent(dayStr)}`);
  };

  // Handle day click from calendar view (fallback)
  const handleDayClick = (dayStr) => {
    // Navigate to list view with day parameter for scrolling
    router.push(`/?day=${encodeURIComponent(dayStr)}`);
  };

  // Handle view toggle - navigate to different views
  const handleViewChange = (view) => {
    if (view === "list") {
      router.push("/");
    } else if (view === "cams") {
      router.push("/cams");
    }
  };

  return (
    <MainLayout>
      <Header />
      {/* Tabs bar - sticky on mobile and desktop */}
      <div className="sticky top-[57px] z-40 bg-newsprint border-b border-ink/20 py-3 md:py-4">
        <div className="flex items-center justify-between gap-2">
          <ViewToggle onChange={handleViewChange} />
        </div>
      </div>
      <div className="h-4" /> {/* Spacer below tabs */}

      {!loading ? (
        <CalendarView
          grouped={filteredGrouped}
          sortedDays={sortedDays}
          spotsMap={spotsMap}
          selectedSports={selectedSports}
          onSpotClick={handleSpotClick}
          onDayClick={handleDayClick}
        />
      ) : (
        <Loader />
      )}

      <Footer mostRecentScrapeTimestamp={mostRecentScrapeTimestamp} />
    </MainLayout>
  );
}

