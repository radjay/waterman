"use client";

import { useState, useEffect } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { MainLayout } from "../components/templates/MainLayout";
import { Header } from "../components/organisms/Header";
import { SportSelector } from "../components/organisms/SportSelector";
import { EmptyState } from "../components/organisms/EmptyState";
import { DaySection } from "../components/organisms/DaySection";
import { formatDate, formatTime } from "../lib/utils";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function Home() {
  const [selectedSports, setSelectedSports] = useState(["wingfoil"]);
  const [spots, setSpots] = useState([]);
  const [allSlots, setAllSlots] = useState([]);
  const [spotsMap, setSpotsMap] = useState({}); // Map spotId to spot data
  const [loading, setLoading] = useState(true);

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
        fetchedSpots.forEach(spot => {
          spotsMapObj[spot._id] = spot;
        });
        setSpotsMap(spotsMapObj);

        // Fetch forecasts for each spot
        const slotsPromises = fetchedSpots.map(async (spot) => {
          // Get configs for each sport this spot supports
          const spotSports = (spot.sports && spot.sports.length > 0) ? spot.sports : ["wingfoil"]; // Default to wingfoil if no sports
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

          const enrichedSlots = slotsData
            .map((slot) => {
              const date = new Date(slot.timestamp);
              const hourStr = formatTime(date);
              const isEpic = slot.speed >= 20 && slot.gust - slot.speed <= 10;

              // Detect tide-only entries: have tide data but no meaningful wind/wave data
              const isTideOnly = (slot.isTideOnly || 
                (slot.tideTime && slot.tideType && 
                 (slot.speed === 0 || !slot.speed) && 
                 (slot.gust === 0 || !slot.gust) &&
                 (slot.waveHeight === 0 || !slot.waveHeight)));
              
              return {
                ...slot,
                spotName: spot.name,
                spotId: spot._id,
                hour: hourStr,
                isEpic,
                sport: null, // Will determine based on config matching
                isTideOnly: isTideOnly, // Mark tide-only entries
              };
            })
            .filter((slot) => {
              // Keep tide-only entries - they're needed for tide display
              if (slot.isTideOnly) {
                return true;
              }
              // Apply filtering based on sport configs for forecast slots
              for (const config of configs) {
                if (!config) continue;

                if (config.sport === "wingfoil") {
                  const isSpeed = slot.speed >= (config.minSpeed || 0);
                  const isGust = slot.gust >= (config.minGust || 0);
                  let isDir = false;
                  if (config.directionFrom && config.directionTo) {
                    if (config.directionFrom <= config.directionTo) {
                      isDir =
                        slot.direction >= config.directionFrom &&
                        slot.direction <= config.directionTo;
                    } else {
                      isDir =
                        slot.direction >= config.directionFrom ||
                        slot.direction <= config.directionTo;
                    }
                  } else {
                    isDir = true; // No direction filter
                  }

                  if (isSpeed && isGust && isDir) {
                    slot.sport = "wingfoil";
                    return true;
                  }
                } else if (config.sport === "surfing") {
                  const hasSwell = slot.waveHeight >= (config.minSwellHeight || 0);
                  const hasPeriod = slot.wavePeriod >= (config.minPeriod || 0);
                  let isDir = true;
                  if (config.swellDirectionFrom && config.swellDirectionTo) {
                    if (config.swellDirectionFrom <= config.swellDirectionTo) {
                      isDir =
                        slot.waveDirection >= config.swellDirectionFrom &&
                        slot.waveDirection <= config.swellDirectionTo;
                    } else {
                      isDir =
                        slot.waveDirection >= config.swellDirectionFrom ||
                        slot.waveDirection <= config.swellDirectionTo;
                    }
                  }

                  // Check tide if specified
                  let isTide = true;
                  if (config.optimalTide && slot.tideType) {
                    if (config.optimalTide === "high") {
                      isTide = slot.tideType === "high";
                    } else if (config.optimalTide === "low") {
                      isTide = slot.tideType === "low";
                    }
                    // "both" means any tide is fine
                  }

                  if (hasSwell && hasPeriod && isDir && isTide) {
                    slot.sport = "surfing";
                    return true;
                  }
                }
              }
              return false;
            });

          return enrichedSlots;
        });

        const allFetchedSlots = (await Promise.all(slotsPromises)).flat();
        
        // Include all slots (both forecast and tide-only) for grouping
        // Tide-only entries will be filtered out from display but used for tide matching
        setAllSlots(allFetchedSlots);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedSports]);

  // Group by Date, then by Spot
  // Separate tide-only entries to include in tide section
  const grouped = allSlots.reduce((acc, slot) => {
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

  // Sort days chronologically
  const sortedDays = Object.keys(grouped).sort((a, b) => {
    const firstSlotA = grouped[a][Object.keys(grouped[a])[0]]?.[0];
    const firstSlotB = grouped[b][Object.keys(grouped[b])[0]]?.[0];
    if (!firstSlotA || !firstSlotB) return 0;
    return firstSlotA.timestamp - firstSlotB.timestamp;
  });

  // Sort slots within each spot group and identify ideal slot
  sortedDays.forEach((day) => {
    Object.keys(grouped[day]).forEach((spotId) => {
      // Skip tide-only entries for ideal slot calculation
      if (spotId === '_tides') return;
      
      const slots = grouped[day][spotId];
      slots.sort((a, b) => a.timestamp - b.timestamp);

      if (slots.length > 0) {
        // Find max speed slot for wingfoil, or best swell for surfing
        const maxSpeed = Math.max(...slots.map((s) => s.speed || 0));
        const idealSlot = slots.find((s) => s.speed === maxSpeed);
        if (idealSlot) {
          idealSlot.isIdeal = true;
        }
      }
    });
  });

  return (
    <MainLayout>
      <Header />
      <SportSelector onSportsChange={setSelectedSports} />

      {loading ? (
        <div className="text-center py-8 text-ink">Loading...</div>
      ) : sortedDays.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-8">
          {sortedDays.map((day) => (
            <DaySection
              key={day}
              day={day}
              spotsData={grouped[day]}
              selectedSports={selectedSports}
              spotsMap={spotsMap}
            />
          ))}
        </div>
      )}
    </MainLayout>
  );
}
