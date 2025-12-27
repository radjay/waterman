"use client";

import { useState, useEffect, useMemo } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { MainLayout } from "../components/layout/MainLayout";
import { Header } from "../components/layout/Header";
import { SportSelector } from "../components/layout/SportSelector";
import { ShowFilter } from "../components/layout/ShowFilter";
import { EmptyState } from "../components/common/EmptyState";
import { DaySection } from "../components/forecast/DaySection";
import { Footer } from "../components/layout/Footer";
import { formatDate, formatFullDay } from "../lib/utils";
import { enrichSlots, filterAndSortDays, markIdealSlots } from "../lib/slots";
import { usePersistedState } from "../lib/hooks/usePersistedState";
import { ListFilter } from "lucide-react";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function Home() {
  // Use persisted state hook for sport selection
  const [selectedSport, setSelectedSport] = usePersistedState(
    "waterman_selected_sport",
    "wingfoil",
    (val) => val === "wingfoil" || val === "surfing"
  );

  // Convert single sport to array format (used throughout the app)
  // Memoize to prevent infinite loops in useEffect dependencies
  const selectedSports = useMemo(() => [selectedSport], [selectedSport]);

  // Handle sport change from SportSelector
  const handleSportChange = (sportId) => {
    setSelectedSport(sportId);
  };

  // Use persisted state hook for filter
  const [showFilter, setShowFilter] = usePersistedState(
    "waterman_show_filter",
    "best",
    (val) => val === "best" || val === "all"
  );
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
        // Fetch spots filtered by selected sports
        const fetchedSpots = await client.query(api.spots.list, {
          sports: selectedSports,
        });

        setSpots(fetchedSpots);

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

          const [slotsData, ...configs] = await Promise.all([
            client.query(api.spots.getForecastSlots, { spotId: spot._id }),
            ...configPromises,
          ]);

          if (!slotsData) return [];

          const enrichedSlots = enrichSlots(slotsData, spot, configs);

          return enrichedSlots;
        });

        const allFetchedSlots = (await Promise.all(slotsPromises)).flat();

        // Include all slots (both forecast and tide-only) for grouping
        // Tide-only entries will be filtered out from display but used for tide matching
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
  // "best" shows all slots that match criteria
  // "all" shows all slots regardless of criteria matching
  const filteredSlots =
    showFilter === "best"
      ? allSlots.filter((slot) => slot.matchesCriteria || slot.isTideOnly)
      : allSlots; // "all" shows all slots (including those that don't match criteria)

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

  return (
    <MainLayout>
      <Header />
      <div className="flex items-center justify-end gap-2 mb-6">
        <ListFilter size={18} className="text-ink" />
        <SportSelector
          value={selectedSport}
          onSportsChange={handleSportChange}
        />
        <ShowFilter value={showFilter} onFilterChange={setShowFilter} />
      </div>

      {loading ? (
        <div className="text-center py-8 text-ink">Loading...</div>
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
                day={day}
                spotsData={dayData}
                selectedSports={selectedSports}
                spotsMap={spotsMap}
                showFilter={showFilter}
              />
            );
          })}
        </div>
      )}
      <Footer mostRecentScrapeTimestamp={mostRecentScrapeTimestamp} />
    </MainLayout>
  );
}
