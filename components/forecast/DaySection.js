"use client";

import { useState } from "react";
import { ForecastSlot } from "./ForecastSlot";
import { WebcamModal } from "../common/WebcamModal";
import { Video, ChartSpline } from "lucide-react";

/**
 * DaySection component displays forecast slots grouped by day and spot.
 * 
 * Groups forecast data by day, then by spot within each day. Shows webcam
 * and live report links for spots that have them. Handles tide data display
 * for surfing spots.
 * 
 * @param {string} day - Day label (e.g., "Monday, January 1")
 * @param {Array} slots - Legacy slots array (deprecated, use spotsData instead)
 * @param {Object} spotsData - Object mapping spotId to array of forecast slots
 * @param {Array<string>} selectedSports - Currently selected sports
 * @param {Object} spotsMap - Map of spotId to spot metadata
 * @param {string} showFilter - Filter mode: "best" or "all"
 * @param {string} className - Additional CSS classes
 */
export function DaySection({ day, slots, spotsData, selectedSports, spotsMap = {}, showFilter = "best", className = "" }) {
  const [selectedWebcam, setSelectedWebcam] = useState(null);
  // Support both old format (slots array) and new format (spotsData object)
  const spots = spotsData || {};
  
  // If slots prop is provided (old format), convert to new format
  const spotsDataFromSlots = slots
    ? slots.reduce((acc, slot) => {
        if (!acc[slot.spotId]) acc[slot.spotId] = [];
        acc[slot.spotId].push(slot);
        return acc;
      }, {})
    : {};

  const finalSpotsData = Object.keys(spots).length > 0 ? spots : spotsDataFromSlots;
  const spotIds = Object.keys(finalSpotsData);

  const hasSurfing = selectedSports && selectedSports.includes("surfing");
  
  // Debug: Log to see what we're working with
  // console.log("DaySection - finalSpotsData:", finalSpotsData);
  // console.log("DaySection - hasSurfing:", hasSurfing);
  
  // Helper to find tide for a slot - show each tide only once
  // A tide should be shown in a slot if:
  // 1. It's between the current slot and the next slot, OR
  // 2. It's between the previous slot and the current slot
  const findTideForSlot = (slotTimestamp, nextSlotTimestamp, spotTides, usedTides) => {
    if (!spotTides || spotTides.length === 0) return null;
    
    // Find tides that fit between current and next, or previous and current
    let bestTide = null;
    let bestDiff = Infinity;
    
    spotTides.forEach(tide => {
      // Skip if this tide was already used
      if (usedTides.has(tide.time)) return;
      
      const tideTime = tide.time;
      
      // Check if tide is between current and next slot
      if (nextSlotTimestamp && tideTime >= slotTimestamp && tideTime < nextSlotTimestamp) {
        const diff = tideTime - slotTimestamp;
        if (diff < bestDiff) {
          bestDiff = diff;
          bestTide = tide;
        }
      }
      // Check if tide is between previous and current (tide is before current slot)
      // We'll show it in the current slot if it's the closest one before
      else if (tideTime < slotTimestamp) {
        const diff = slotTimestamp - tideTime;
        // Only consider if it's within 3 hours and closer than any other candidate
        if (diff <= 3 * 60 * 60 * 1000 && diff < bestDiff) {
          bestDiff = diff;
          bestTide = tide;
        }
      }
    });
    
    if (bestTide) {
      usedTides.add(bestTide.time);
      // Ensure type is preserved
      return {
        ...bestTide,
        type: bestTide.type || (bestTide.height > 2 ? 'high' : 'low') // Fallback if type missing
      };
    }
    return null;
  };
  
  // Get all tides grouped by spot
  const tidesBySpot = {};
  
  // Collect all tides for each spot (from both forecast slots and tide-only entries)
  Object.keys(finalSpotsData).forEach(spotId => {
    if (spotId === '_tides') return;
    const spotSlots = finalSpotsData[spotId];
    
    // Get tides from both forecast slots (that have tide data) and tide-only entries
    const spotTides = spotSlots
      .filter(s => s.tideTime && s.tideType) // Both regular slots with tide data and tide-only entries
      .map(s => ({
        time: s.tideTime,
        type: s.tideType,
        height: s.tideHeight,
      }))
      // Remove duplicates by time
      .filter((tide, index, self) => 
        index === self.findIndex(t => t.time === tide.time)
      );
    
    if (spotTides.length > 0) {
      const spotName = spotSlots.find(s => s.spotName)?.spotName || spotSlots[0]?.spotName || "Unknown Spot";
      tidesBySpot[spotId] = {
        spotName,
        tides: spotTides.map(tide => {
          const date = new Date(tide.time);
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return {
            ...tide,
            timeStr: `${hours}:${minutes}`
          };
        }).sort((a, b) => a.time - b.time) // Sort by time
      };
    }
  });

  // Get the actual date from the first slot to format properly
  const getFormattedDay = () => {
    const firstSpotId = Object.keys(finalSpotsData).find(id => id !== '_tides');
    if (firstSpotId && finalSpotsData[firstSpotId] && finalSpotsData[firstSpotId].length > 0) {
      const firstSlot = finalSpotsData[firstSpotId].find(slot => !slot.isTideOnly);
      if (firstSlot && firstSlot.timestamp) {
        const dateObj = new Date(firstSlot.timestamp);
        return dateObj.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });
      }
    }
    // Fallback to original format if we can't get the date
    return day;
  };

  return (
    <div className={`mb-4 ${className}`}>
      <div className="font-headline text-[1.26rem] font-bold border-b-2 border-ink mb-4 pb-1 sticky top-0 bg-newsprint z-10 text-ink pl-2">
        {getFormattedDay()}
      </div>
      
      {spotIds.filter(id => id !== '_tides').map((spotId) => {
        const spotSlots = finalSpotsData[spotId];
        
        // Filter out tide-only entries to check if there's actual forecast data
        const forecastSlots = spotSlots.filter(slot => !slot.isTideOnly);
        
        // Don't render the spot if there's no forecast data to show
        if (!forecastSlots || forecastSlots.length === 0) {
          return null;
        }
        
        const spotName = spotSlots[0]?.spotName || "Unknown Spot";
        const spotTides = tidesBySpot[spotId];
        // Check if this is a surfing spot by checking the spot's sports array
        const spot = spotsMap[spotId];
        const isSurfingSpot = hasSurfing && spot && spot.sports && spot.sports.includes("surfing");
        
        // Debug logging
        // if (isSurfingSpot && spotTides) {
        //   console.log(`Spot ${spotName} has ${spotTides.tides.length} tides`);
        // }
        
        const webcamUrl = spot?.webcamUrl;
        const webcamStreamSource = spot?.webcamStreamSource;
        const liveReportUrl = spot?.liveReportUrl;
        const isWindSport = spot && spot.sports && spot.sports.some(s => s === "wingfoil");
        
        return (
          <div key={spotId} className="mb-6 last:mb-0">
            <div className="flex items-center justify-between font-headline text-[1.3rem] font-bold text-ink mb-2 px-2">
              <span>{spotName}</span>
              <div className="flex items-center gap-2">
                {liveReportUrl && isWindSport && (
                  <a
                    href={liveReportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#e8ebe8] rounded-full p-1.5 hover:bg-[#dde0dd] transition-colors flex items-center justify-center"
                    aria-label="View live wind report"
                    title="Live wind report"
                  >
                    <ChartSpline size={18} className="text-black" />
                  </a>
                )}
                {webcamUrl && (
                  <button
                    onClick={() => setSelectedWebcam({ url: webcamUrl, name: spotName, streamSource: webcamStreamSource })}
                    className="bg-[#e8ebe8] rounded-full p-1.5 hover:bg-[#dde0dd] transition-colors flex items-center justify-center"
                    aria-label="View webcam"
                  >
                    <Video size={18} className="text-black" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Show message if no tide data */}
            {isSurfingSpot && !spotTides && (
              <div className="text-xs text-ink/60 mb-2 px-2">
                No tide data available
              </div>
            )}
            
            <div className="flex flex-col border-t border-ink">
              {(() => {
                // Track which tides have been used across all slots to avoid duplicates
                const usedTides = new Set();
                
                return spotSlots
                  .filter(slot => !slot.isTideOnly) // Don't show tide-only entries as forecast slots
                  .map((slot, index, array) => {
                    // Get next slot timestamp
                    const nextSlot = index < array.length - 1 ? array[index + 1] : null;
                    const nextSlotTimestamp = nextSlot ? nextSlot.timestamp : null;
                    
                    const nearbyTide = isSurfingSpot && spotTides 
                      ? findTideForSlot(slot.timestamp, nextSlotTimestamp, spotTides.tides, usedTides)
                      : null;
                    
                    return (
                      <ForecastSlot 
                        key={slot._id} 
                        slot={slot}
                        nearbyTide={nearbyTide}
                        isSurfing={isSurfingSpot}
                        showFilter={showFilter}
                      />
                    );
                  });
              })()}
            </div>
          </div>
        );
      })}
      
      {/* Webcam Modal */}
      {selectedWebcam && (
        <WebcamModal
          isOpen={!!selectedWebcam}
          onClose={() => setSelectedWebcam(null)}
          webcamUrl={selectedWebcam.url}
          spotName={selectedWebcam.name}
          webcamStreamSource={selectedWebcam.streamSource}
        />
      )}
    </div>
  );
}

