"use client";

import { useMemo } from "react";
import { formatDate, formatFullDay, formatTideTime } from "../../lib/utils";
import { ScorePill } from "../ui/ScorePill";
import { ConditionLine } from "../ui/ConditionLine";

/**
 * CalendarView component displays a 7-day calendar showing which days are best
 * at which spots for each sport.
 * 
 * @param {Object} grouped - Object mapping day strings to spot data
 * @param {Array} sortedDays - Sorted array of day strings
 * @param {Object} spotsMap - Map of spotId to spot metadata
 * @param {Array<string>} selectedSports - All sports (always ["wingfoil", "surfing"] for calendar)
 * @param {Function} onDayClick - Callback when a day is clicked (deprecated, use onSpotClick instead)
 * @param {Function} onSpotClick - Callback when a spot/sport combo is clicked (sport, dayStr)
 */
export function CalendarView({
  grouped,
  sortedDays,
  spotsMap,
  selectedSports,
  onDayClick,
  onSpotClick,
}) {
  // Get the next 9 days starting from today
  const next9Days = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 9; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  }, []);

  // For each day, determine which spots are "best" (have slots with score >= 60)
  // Include condition data (wind for wingfoil, waves for surfing)
  const dayBestSpots = useMemo(() => {
    const result = {};

      next9Days.forEach((date) => {
      const dayStr = formatDate(date);
      const dayData = grouped[dayStr] || {};

      // Find spots with best conditions (score >= 60) for this day
      const bestSpots = [];

      Object.keys(dayData).forEach((spotId) => {
        if (spotId === "_tides") return;

        const slots = dayData[spotId] || [];
        // Filter to forecast slots (not tide-only)
        const forecastSlots = slots.filter((slot) => !slot.isTideOnly);

        // Check if any slot has a good score (>= 60) for any selected sport
        const hasGoodConditions = forecastSlots.some((slot) => {
          if (!slot.score) return false;
          return slot.score.value >= 60;
        });

        if (hasGoodConditions && forecastSlots.length > 0) {
          const spot = spotsMap[spotId];
          const spotName = spot?.name || forecastSlots[0]?.spotName || "Unknown";
          const spotSports = spot?.sports || [];
          
          // For each sport that this spot supports, find the best slot
          const sportData = [];

          if (spotSports.includes("wingfoil")) {
            // Find best wingfoil slot
            const wingfoilSlots = forecastSlots.filter(s => s.sport === "wingfoil" && s.score && s.score.value >= 60);
            if (wingfoilSlots.length > 0) {
              const bestWingfoilSlot = wingfoilSlots.reduce((best, current) => {
                if (!best) return current;
                return (current.score.value > best.score.value) ? current : best;
              }, null);

              if (bestWingfoilSlot) {
                // Get wave data from the same slot
                const displayWaveDirection = bestWingfoilSlot.waveDirection !== undefined && bestWingfoilSlot.waveDirection !== null
                  ? (bestWingfoilSlot.waveDirection + 180) % 360
                  : bestWingfoilSlot.waveDirection;

                // Extract time from the slot
                const bestTime = bestWingfoilSlot.hour || (bestWingfoilSlot.timestamp ? formatTideTime(bestWingfoilSlot.timestamp) : null);

                sportData.push({
                  sport: "wingfoil",
                  score: bestWingfoilSlot.score.value,
                  bestTime,
                  conditionData: {
                    type: "wingfoil",
                    windSpeed: bestWingfoilSlot.speed,
                    windGust: bestWingfoilSlot.gust,
                    windDirection: bestWingfoilSlot.direction,
                    waveHeight: bestWingfoilSlot.waveHeight,
                    wavePeriod: bestWingfoilSlot.wavePeriod,
                    waveDirection: displayWaveDirection,
                  },
                });
              }
            }
          }

          if (spotSports.includes("kitesurfing")) {
            // Find best kitesurfing slot
            const kitesurfingSlots = forecastSlots.filter(s => s.sport === "kitesurfing" && s.score && s.score.value >= 60);
            if (kitesurfingSlots.length > 0) {
              const bestKitesurfingSlot = kitesurfingSlots.reduce((best, current) => {
                if (!best) return current;
                return (current.score.value > best.score.value) ? current : best;
              }, null);

              if (bestKitesurfingSlot) {
                // Get wave data from the same slot
                const displayWaveDirection = bestKitesurfingSlot.waveDirection !== undefined && bestKitesurfingSlot.waveDirection !== null
                  ? (bestKitesurfingSlot.waveDirection + 180) % 360
                  : bestKitesurfingSlot.waveDirection;

                // Extract time from the slot
                const bestTime = bestKitesurfingSlot.hour || (bestKitesurfingSlot.timestamp ? formatTideTime(bestKitesurfingSlot.timestamp) : null);

                sportData.push({
                  sport: "kitesurfing",
                  score: bestKitesurfingSlot.score.value,
                  bestTime,
                  conditionData: {
                    type: "kitesurfing",
                    windSpeed: bestKitesurfingSlot.speed,
                    windGust: bestKitesurfingSlot.gust,
                    windDirection: bestKitesurfingSlot.direction,
                    waveHeight: bestKitesurfingSlot.waveHeight,
                    wavePeriod: bestKitesurfingSlot.wavePeriod,
                    waveDirection: displayWaveDirection,
                  },
                });
              }
            }
          }

          if (spotSports.includes("surfing")) {
            // Find best surfing slot
            const surfingSlots = forecastSlots.filter(s => s.sport === "surfing" && s.score && s.score.value >= 60);
            if (surfingSlots.length > 0) {
              const bestSurfingSlot = surfingSlots.reduce((best, current) => {
                if (!best) return current;
                return (current.score.value > best.score.value) ? current : best;
              }, null);
              
              if (bestSurfingSlot) {
                // Get wind data from the same slot
                const displayWaveDirection = bestSurfingSlot.waveDirection !== undefined && bestSurfingSlot.waveDirection !== null
                  ? (bestSurfingSlot.waveDirection + 180) % 360
                  : bestSurfingSlot.waveDirection;
                
                // Extract time from the slot
                const bestTime = bestSurfingSlot.hour || (bestSurfingSlot.timestamp ? formatTideTime(bestSurfingSlot.timestamp) : null);
                
                sportData.push({
                  sport: "surfing",
                  score: bestSurfingSlot.score.value,
                  bestTime,
                  conditionData: {
                    type: "surfing",
                    waveHeight: bestSurfingSlot.waveHeight,
                    wavePeriod: bestSurfingSlot.wavePeriod,
                    waveDirection: displayWaveDirection,
                    windSpeed: bestSurfingSlot.speed,
                    windGust: bestSurfingSlot.gust,
                    windDirection: bestSurfingSlot.direction,
                  },
                });
              }
            }
          }
          
          // Only add spot if it has at least one sport with good conditions
          if (sportData.length > 0) {
            // Sort by score (highest first)
            sportData.sort((a, b) => b.score - a.score);
            
            bestSpots.push({
              spotId,
              spotName,
              sportData, // Array of sports with their data
              bestScore: sportData[0].score, // Best score across all sports
            });
          }
        }
      });

      // Group spots by sport, then sort by score within each sport group
      const wingfoilSpots = bestSpots.filter(s => s.sportData.some(sd => sd.sport === "wingfoil"));
      const kitesurfingSpots = bestSpots.filter(s => s.sportData.some(sd => sd.sport === "kitesurfing"));
      const surfingSpots = bestSpots.filter(s => s.sportData.some(sd => sd.sport === "surfing"));

      // Sort within each group by best score
      wingfoilSpots.sort((a, b) => b.bestScore - a.bestScore);
      kitesurfingSpots.sort((a, b) => b.bestScore - a.bestScore);
      surfingSpots.sort((a, b) => b.bestScore - a.bestScore);

      // Combine: wingfoil first, then kitesurfing, then surfing
      const groupedSpots = [...wingfoilSpots, ...kitesurfingSpots, ...surfingSpots];

      result[dayStr] = {
        spots: groupedSpots,
        wingfoilSpots,
        kitesurfingSpots,
        surfingSpots,
      };
    });

    return result;
  }, [next9Days, grouped, spotsMap, selectedSports]);

  // Format day for display (compact format for calendar)
  const formatDayHeader = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const tomorrowStr = `${tomorrow.getFullYear()}-${tomorrow.getMonth()}-${tomorrow.getDate()}`;

    if (dateStr === todayStr) return "Today";
    if (dateStr === tomorrowStr) return "Tomorrow";
    
    // Compact format: "Mon, Jan 7"
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {next9Days.map((date) => {
        const dayStr = formatDate(date);
        const dayInfo = dayBestSpots[dayStr] || { spots: [] };
        const hasGoodConditions = dayInfo.spots.length > 0;

        // RAD-31: Flat chronological list — collect all entries across all sports,
        // sort by bestTime, then by score. Sport section headers are removed;
        // the sport icon on the ScorePill is the sole sport indicator.
        const flatEntries = [];
        for (const spot of dayInfo.spots) {
          for (const sportData of spot.sportData || []) {
            flatEntries.push({ spot, sportData });
          }
        }
        // Sort: by time ascending, then score descending as tiebreaker
        flatEntries.sort((a, b) => {
          const timeA = a.sportData.bestTime || "";
          const timeB = b.sportData.bestTime || "";
          if (timeA !== timeB) return timeA.localeCompare(timeB);
          return (b.sportData.score || 0) - (a.sportData.score || 0);
        });
        // Cap at 6 entries per day
        const visibleEntries = flatEntries.slice(0, 6);
        const hiddenCount = flatEntries.length - visibleEntries.length;

        return (
          <div
            key={dayStr}
            className="border border-ink/20 rounded-lg p-5 bg-newsprint flex flex-col"
          >
            {/* RAD-31: Day header — single font family, weight hierarchy */}
            <div className="font-sans font-bold text-ink mb-3 text-base border-b border-ink/20 pb-2">
              {formatDayHeader(date)}
            </div>

            {/* RAD-31: Flat chronological list, no sport section headers */}
            {hasGoodConditions ? (
              <div className="space-y-2 flex-1">
                {visibleEntries.map(({ spot, sportData }, i) => {
                  const cd = sportData.conditionData;
                  return (
                    <div
                      key={`${spot.spotId}-${sportData.sport}-${i}`}
                      className="border-b border-ink/10 pb-2 last:border-0 last:pb-0 cursor-pointer hover:bg-ink/5 transition-colors -mx-2 px-2 py-1 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSpotClick) onSpotClick(sportData.sport, dayStr);
                        else if (onDayClick) onDayClick(dayStr);
                      }}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        {/* RAD-31: Unified font — font-sans, weight-based hierarchy */}
                        <span className="text-sm font-sans font-semibold text-ink truncate" title={spot.spotName}>
                          {sportData.bestTime ? `${sportData.bestTime} · ${spot.spotName}` : spot.spotName}
                        </span>
                        {/* RAD-31: Slightly larger score badges (md instead of sm) */}
                        <ScorePill score={sportData.score} sport={sportData.sport} size="md" />
                      </div>
                      {cd && (
                        <ConditionLine
                          speed={cd.windSpeed}
                          gust={cd.windGust}
                          direction={cd.windDirection}
                          waveHeight={cd.waveHeight}
                          wavePeriod={cd.wavePeriod}
                          sport={sportData.sport}
                        />
                      )}
                    </div>
                  );
                })}

                {hiddenCount > 0 && (
                  <div className="text-xs font-sans text-ink/50 pt-1">
                    +{hiddenCount} more
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm font-sans text-ink/40 flex-1 flex items-center">
                No conditions
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

