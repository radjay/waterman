"use client";

import { useState, useEffect } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { MainLayout } from "../components/layout/MainLayout";
import { Header } from "../components/layout/Header";
import { SportSelector } from "../components/layout/SportSelector";
import { ShowFilter } from "../components/layout/ShowFilter";
import { EmptyState } from "../components/common/EmptyState";
import { DaySection } from "../components/forecast/DaySection";
import { Footer } from "../components/layout/Footer";
import { formatDate, formatTime } from "../lib/utils";
import { ListFilter } from "lucide-react";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function Home() {
  const [selectedSports, setSelectedSports] = useState(["wingfoil"]);
  const [showFilter, setShowFilter] = useState("best");
  const [spots, setSpots] = useState([]);
  const [allSlots, setAllSlots] = useState([]);
  const [spotsMap, setSpotsMap] = useState({}); // Map spotId to spot data
  const [loading, setLoading] = useState(true);
  const [mostRecentScrapeTimestamp, setMostRecentScrapeTimestamp] = useState(null);

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
              
              // Check if slot matches criteria (but don't filter yet - we'll filter based on showFilter)
              let matchesCriteria = false;
              let matchedSport = null;
              
              if (!isTideOnly) {
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
                      matchesCriteria = true;
                      matchedSport = "wingfoil";
                      break;
                    }
                  } else if (config.sport === "surfing") {
                    const hasSwell = slot.waveHeight >= (config.minSwellHeight || 0);
                    const maxSwell = config.maxSwellHeight 
                      ? slot.waveHeight <= config.maxSwellHeight 
                      : true;
                    const hasPeriod = slot.wavePeriod >= (config.minPeriod || 0);
                    
                    // Direction check is only for marking as "ideal", not for filtering
                    let isDir = true;
                    if (config.swellDirectionFrom !== undefined && config.swellDirectionTo !== undefined && slot.waveDirection !== undefined) {
                      if (config.swellDirectionFrom <= config.swellDirectionTo) {
                        isDir =
                          slot.waveDirection >= config.swellDirectionFrom &&
                          slot.waveDirection <= config.swellDirectionTo;
                      } else {
                        // Handle wrap-around case (e.g., 350-10 degrees)
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

                    // For surfing: show if wave height, period, and tide match (direction is only for ideal marking)
                    if (hasSwell && maxSwell && hasPeriod && isTide) {
                      matchesCriteria = true;
                      matchedSport = "surfing";
                      // Store direction match separately for ideal marking
                      slot.isIdealDirection = isDir;
                      break;
                    }
                  }
                }
              }
              
              return {
                ...slot,
                spotName: spot.name,
                spotId: spot._id,
                hour: hourStr,
                isEpic,
                sport: matchedSport,
                isTideOnly: isTideOnly, // Mark tide-only entries
                matchesCriteria: matchesCriteria || isTideOnly, // Tide-only entries always "match" for display purposes
              };
            });

          return enrichedSlots;
        });

        const allFetchedSlots = (await Promise.all(slotsPromises)).flat();
        
        // Include all slots (both forecast and tide-only) for grouping
        // Tide-only entries will be filtered out from display but used for tide matching
        setAllSlots(allFetchedSlots);

        // Fetch most recent scrape timestamp
        const scrapeTimestamp = await client.query(api.spots.getMostRecentScrapeTimestamp);
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
  const filteredSlots = showFilter === "best" 
    ? allSlots.filter(slot => slot.matchesCriteria || slot.isTideOnly)
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
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  
  const sortedDays = Object.keys(grouped)
    .filter((day) => {
      // Get the first slot for this day to check the date
      const firstSlot = grouped[day][Object.keys(grouped[day])[0]]?.[0];
      if (!firstSlot) return false;
      
      const slotDate = new Date(firstSlot.timestamp);
      slotDate.setHours(0, 0, 0, 0); // Start of the slot's day
      
      // Only include today and future dates
      return slotDate >= today;
    })
    .sort((a, b) => {
      const firstSlotA = grouped[a][Object.keys(grouped[a])[0]]?.[0];
      const firstSlotB = grouped[b][Object.keys(grouped[b])[0]]?.[0];
      if (!firstSlotA || !firstSlotB) return 0;
      return firstSlotA.timestamp - firstSlotB.timestamp;
    });

  // Sort slots within each spot group and identify ideal slot
  // Only mark as ideal if the slot matches criteria
  sortedDays.forEach((day) => {
    Object.keys(grouped[day]).forEach((spotId) => {
      // Skip tide-only entries for ideal slot calculation
      if (spotId === '_tides') return;
      
      const slots = grouped[day][spotId];
      slots.sort((a, b) => a.timestamp - b.timestamp);

      // Filter to only slots that match criteria
      const matchingSlots = slots.filter(s => s.matchesCriteria && !s.isTideOnly);
      
      if (matchingSlots.length > 0) {
        // Check if this is a surfing spot (has slots with sport === "surfing")
        const isSurfingSpot = matchingSlots.some(s => s.sport === "surfing");
        
        let idealSlot = null;
        
        if (isSurfingSpot) {
          // For surfing: prioritize slots with ideal direction, then best wave height/period
          const idealDirectionSlots = matchingSlots.filter(s => s.isIdealDirection === true);
          const candidates = idealDirectionSlots.length > 0 ? idealDirectionSlots : matchingSlots;
          
          // Find best wave (height * period as a simple quality metric)
          const bestWave = Math.max(...candidates.map((s) => (s.waveHeight || 0) * (s.wavePeriod || 0)));
          idealSlot = candidates.find((s) => (s.waveHeight || 0) * (s.wavePeriod || 0) === bestWave);
        } else {
          // For wingfoil: find max speed slot
          const maxSpeed = Math.max(...matchingSlots.map((s) => s.speed || 0));
          idealSlot = matchingSlots.find((s) => s.speed === maxSpeed);
        }
        
        if (idealSlot) {
          idealSlot.isIdeal = true;
        }
      }
    });
  });

  return (
    <MainLayout>
      <Header />
      <div className="flex items-center justify-end gap-2 mb-6">
        <ListFilter size={18} className="text-ink" />
        <SportSelector onSportsChange={setSelectedSports} />
        <ShowFilter onFilterChange={setShowFilter} />
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
            const hasForecastSlots = Object.keys(dayData).some(spotId => {
              if (spotId === '_tides') return false;
              const slots = dayData[spotId] || [];
              return slots.some(slot => !slot.isTideOnly);
            });

            if (!hasForecastSlots) {
              // Get the actual date from any slot (including tide-only) to format properly
              const getFormattedDay = () => {
                // Try to find any slot with a timestamp
                for (const spotId of Object.keys(dayData)) {
                  if (spotId === '_tides') continue;
                  const slots = dayData[spotId] || [];
                  if (slots.length > 0) {
                    const firstSlot = slots[0];
                    if (firstSlot && firstSlot.timestamp) {
                      const dateObj = new Date(firstSlot.timestamp);
                      return dateObj.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      });
                    }
                  }
                }
                // Try tide entries
                if (dayData._tides && dayData._tides.length > 0) {
                  const firstTide = dayData._tides[0];
                  if (firstTide && firstTide.tideTime) {
                    const dateObj = new Date(firstTide.tideTime);
                    return dateObj.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    });
                  }
                }
                // Parse the day string as fallback (format: "Mon, Dec 7")
                try {
                  const parts = day.split(', ');
                  if (parts.length === 2) {
                    const monthDay = parts[1].split(' ');
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const monthIndex = monthNames.indexOf(monthDay[0]);
                    if (monthIndex !== -1) {
                      const currentYear = new Date().getFullYear();
                      const dateObj = new Date(currentYear, monthIndex, parseInt(monthDay[1]));
                      return dateObj.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      });
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
