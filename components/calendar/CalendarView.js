"use client";

import { useMemo } from "react";
import { Wind, Waves } from "lucide-react";
import { formatDate, formatFullDay, getDisplayWindDirection, formatTideTime } from "../../lib/utils";
import { Arrow } from "../ui/Arrow";

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
      const surfingSpots = bestSpots.filter(s => s.sportData.some(sd => sd.sport === "surfing"));
      
      // Sort within each group by best score
      wingfoilSpots.sort((a, b) => b.bestScore - a.bestScore);
      surfingSpots.sort((a, b) => b.bestScore - a.bestScore);
      
      // Combine: wingfoil first, then surfing
      const groupedSpots = [...wingfoilSpots, ...surfingSpots];

      result[dayStr] = {
        spots: groupedSpots,
        wingfoilSpots,
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
      {next9Days.map((date, index) => {
        const dayStr = formatDate(date);
        const dayInfo = dayBestSpots[dayStr] || { spots: [] };
        const bestSpots = dayInfo.spots;
        const dayData = grouped[dayStr];
        const hasData = dayData && Object.keys(dayData).length > 0;
        const hasGoodConditions = bestSpots.length > 0;

        return (
          <div
            key={dayStr}
            className="border border-ink/20 rounded-lg p-5 bg-newsprint flex flex-col"
          >
            {/* Day header */}
            <div className="font-headline font-bold text-ink mb-3 text-base border-b border-ink/20 pb-2">
              {formatDayHeader(date)}
            </div>

            {/* Spots list - grouped by sport */}
            {hasGoodConditions ? (
              <div className="space-y-5 flex-1">
                {/* Wingfoil spots */}
                {dayInfo.wingfoilSpots && dayInfo.wingfoilSpots.length > 0 && (
                  <div>
                    <div className="text-sm font-bold text-ink/60 mb-3 uppercase">Wingfoil</div>
                    <div className="space-y-3">
                      {dayInfo.wingfoilSpots.slice(0, 3).map((spot) => {
                        const wingfoilSportData = spot.sportData?.find(sd => sd.sport === "wingfoil");
                        const bestTime = wingfoilSportData?.bestTime;
                        return (
                        <div 
                          key={spot.spotId} 
                          className="border-b border-ink/10 pb-3 last:border-0 last:pb-0 cursor-pointer hover:bg-ink/5 transition-colors -mx-2 px-2 py-1 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSpotClick) {
                              onSpotClick("wingfoil", dayStr);
                            } else if (onDayClick) {
                              onDayClick(dayStr);
                            }
                          }}
                        >
                          <div className="text-sm font-headline font-bold text-ink mb-2" title={spot.spotName}>
                            {bestTime ? `${bestTime} - ${spot.spotName}` : spot.spotName}
                          </div>
                          {spot.sportData && spot.sportData.length > 0 && (
                            <div className="text-sm text-ink/70 space-y-1.5">
                              {spot.sportData
                                .filter(sd => sd.sport === "wingfoil")
                                .map((sport) => (
                                  <div key={sport.sport}>
                                    {/* Wind data first for wingfoil */}
                                    <div className="flex items-center gap-1.5">
                                      <Wind size={12} className="text-ink/70" />
                                      <span>
                                        {Math.round(sport.conditionData.windSpeed)} kn
                                        {sport.conditionData.windGust && ` (${Math.round(sport.conditionData.windGust)}*)`}
                                      </span>
                                      {sport.conditionData.windDirection !== undefined && sport.conditionData.windDirection !== null && (
                                        <>
                                          <Arrow direction={sport.conditionData.windDirection} />
                                          <span>{getDisplayWindDirection(sport.conditionData.windDirection)}</span>
                                        </>
                                      )}
                                    </div>
                                    {/* Wave data second for wingfoil */}
                                    {sport.conditionData.waveHeight !== undefined && (
                                      <div className="flex items-center gap-1.5">
                                        <Waves size={12} className="text-ink/70" />
                                        <span>
                                          {sport.conditionData.waveHeight.toFixed(1)}m
                                          {sport.conditionData.wavePeriod && ` (${sport.conditionData.wavePeriod}s)`}
                                        </span>
                                        {sport.conditionData.waveDirection !== undefined && sport.conditionData.waveDirection !== null && (
                                          <>
                                            <Arrow direction={sport.conditionData.waveDirection} />
                                            <span>{getDisplayWindDirection(sport.conditionData.waveDirection)}</span>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Surfing spots */}
                {dayInfo.surfingSpots && dayInfo.surfingSpots.length > 0 && (
                    <div className={dayInfo.wingfoilSpots && dayInfo.wingfoilSpots.length > 0 ? "mt-4 pt-4 border-t border-ink/20" : ""}>
                    <div className="text-sm font-bold text-ink/60 mb-3 uppercase">Surfing</div>
                    <div className="space-y-3">
                      {dayInfo.surfingSpots.slice(0, 3).map((spot) => {
                        const surfingSportData = spot.sportData?.find(sd => sd.sport === "surfing");
                        const bestTime = surfingSportData?.bestTime;
                        return (
                        <div 
                          key={spot.spotId} 
                          className="border-b border-ink/10 pb-3 last:border-0 last:pb-0 cursor-pointer hover:bg-ink/5 transition-colors -mx-2 px-2 py-1 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSpotClick) {
                              onSpotClick("surfing", dayStr);
                            } else if (onDayClick) {
                              onDayClick(dayStr);
                            }
                          }}
                        >
                          <div className="text-sm font-headline font-bold text-ink mb-2" title={spot.spotName}>
                            {bestTime ? `${bestTime} - ${spot.spotName}` : spot.spotName}
                          </div>
                          {spot.sportData && spot.sportData.length > 0 && (
                            <div className="text-sm text-ink/70 space-y-1.5">
                              {spot.sportData
                                .filter(sd => sd.sport === "surfing")
                                .map((sport) => (
                                  <div key={sport.sport}>
                                    {/* Wave data first for surfing */}
                                    {sport.conditionData.waveHeight !== undefined && (
                                      <div className="flex items-center gap-1.5">
                                        <Waves size={12} className="text-ink/70" />
                                        <span>
                                          {sport.conditionData.waveHeight.toFixed(1)}m
                                          {sport.conditionData.wavePeriod && ` (${sport.conditionData.wavePeriod}s)`}
                                        </span>
                                        {sport.conditionData.waveDirection !== undefined && sport.conditionData.waveDirection !== null && (
                                          <>
                                            <Arrow direction={sport.conditionData.waveDirection} />
                                            <span>{getDisplayWindDirection(sport.conditionData.waveDirection)}</span>
                                          </>
                                        )}
                                      </div>
                                    )}
                                    {/* Wind data second for surfing */}
                                    <div className="flex items-center gap-1.5">
                                      <Wind size={12} className="text-ink/70" />
                                      <span>
                                        {Math.round(sport.conditionData.windSpeed)} kn
                                        {sport.conditionData.windGust && ` (${Math.round(sport.conditionData.windGust)}*)`}
                                      </span>
                                      {sport.conditionData.windDirection !== undefined && sport.conditionData.windDirection !== null && (
                                        <>
                                          <Arrow direction={sport.conditionData.windDirection} />
                                          <span>{getDisplayWindDirection(sport.conditionData.windDirection)}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Show more spots indicator if needed */}
                {(dayInfo.wingfoilSpots?.length > 3 || dayInfo.surfingSpots?.length > 3) && (
                  <div className="text-xs text-ink/60 pt-1">
                    +{Math.max((dayInfo.wingfoilSpots?.length || 0) - 3, 0) + Math.max((dayInfo.surfingSpots?.length || 0) - 3, 0)} more spot{(Math.max((dayInfo.wingfoilSpots?.length || 0) - 3, 0) + Math.max((dayInfo.surfingSpots?.length || 0) - 3, 0)) !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-ink/40 flex-1 flex items-center">
                No conditions
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

