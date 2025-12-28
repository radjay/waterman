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
import { enrichSlots, filterAndSortDays, markIdealSlots } from "../../lib/slots";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function CalendarPage() {
  const router = useRouter();

  // Calendar shows all sports, so we always fetch data for both
  const selectedSports = useMemo(() => ["wingfoil", "surfing"], []);
  
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
  }, [selectedSports]);

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

  // Filter out past dates and sort days chronologically
  const sortedDays = filterAndSortDays(grouped);

  // Sort slots within each spot group and identify ideal slot
  markIdealSlots(grouped, selectedSports);

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

  // Handle view toggle - navigate to list view
  const handleViewChange = (view) => {
    if (view === "list") {
      router.push("/");
    }
  };

  return (
    <MainLayout>
      <Header />
      <div className="flex items-center justify-between gap-2 mb-6">
        <ViewToggle onChange={handleViewChange} />
      </div>

      {!loading ? (
        <CalendarView
          grouped={grouped}
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

