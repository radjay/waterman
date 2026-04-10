"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { CalendarView } from "../../components/calendar/CalendarView";
import { Loader } from "../../components/common/Loader";
import { Footer } from "../../components/layout/Footer";
import { formatDate } from "../../lib/utils";
import { enrichSlots, filterAndSortDays, markIdealSlots, markContextualSlots } from "../../lib/slots";
import { isDaylightSlot, isAfterSunset, isNighttimeSlot } from "../../lib/daylight";
import { useUser } from "../../components/auth/AuthProvider";
import { usePersistedState } from "../../lib/hooks/usePersistedState";
import { FilterBar } from "../../components/ui/FilterBar";
import { FilterGroup } from "../../components/ui/FilterGroup";
import { SportFilter, ALL_SPORT_IDS } from "../../components/ui/SportFilter";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function CalendarPage() {
  const router = useRouter();
  const user = useUser();

  // Multi-select sport filter — persisted per page
  const [localSelectedSports, setLocalSelectedSports] = usePersistedState(
    "waterman_calendar_sports",
    [],
    (val) => Array.isArray(val) && val.every((s) => ALL_SPORT_IDS.includes(s))
  );

  const handleSportToggle = (sportId) => {
    setLocalSelectedSports((prev) => {
      if (prev.includes(sportId)) {
        return prev.filter((s) => s !== sportId);
      } else {
        return [...prev, sportId];
      }
    });
  };

  // Empty array = all sports selected
  const selectedSports = useMemo(
    () => (localSelectedSports.length > 0 ? localSelectedSports : ALL_SPORT_IDS),
    [localSelectedSports]
  );

  const sportLabels = { wingfoil: "Wing", kitesurfing: "Kite", surfing: "Surf" };
  const activeFilters = localSelectedSports.length === 0
    ? []
    : localSelectedSports.map((s) => sportLabels[s]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSports.join(","), user]);

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
    const urlSport = sport === "wingfoil" ? "wing" : sport === "kitesurfing" ? "kite" : "surf";
    // Navigate to sport route with "all" filter and day parameter for scrolling
    router.push(`/${urlSport}/all?day=${encodeURIComponent(dayStr)}`);
  };

  // Handle day click from calendar view (fallback)
  const handleDayClick = (dayStr) => {
    // Navigate to report view with day parameter for scrolling
    router.push(`/report?day=${encodeURIComponent(dayStr)}`);
  };

  return (
    <MainLayout>
      <Header />

      <FilterBar activeFilters={activeFilters}>
        <FilterGroup label="Sport">
          <SportFilter
            selectedSports={localSelectedSports}
            onToggle={handleSportToggle}
          />
        </FilterGroup>
      </FilterBar>

      <div className="pt-4">
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
      </div>

      {!loading && <Footer mostRecentScrapeTimestamp={mostRecentScrapeTimestamp} />}
    </MainLayout>
  );
}

