/**
 * Tide-related utility functions.
 */

// Import formatTideTime from utils
import { formatTideTime } from "./utils";

/**
 * Check if a slot is a tide-only entry (has tide data but no meaningful wind/wave data).
 * 
 * @param {Object} slot - Forecast slot
 * @returns {boolean} True if slot is tide-only
 */
export function isTideOnlySlot(slot) {
  return slot.isTideOnly || (
    slot.tideTime && 
    slot.tideType && 
    (slot.speed === 0 || !slot.speed) && 
    (slot.gust === 0 || !slot.gust) &&
    (slot.waveHeight === 0 || !slot.waveHeight)
  );
}

/**
 * Find the closest tide for a forecast slot timestamp.
 * 
 * @param {number} slotTimestamp - Forecast slot timestamp
 * @param {number|null} nextSlotTimestamp - Next slot timestamp (for range)
 * @param {Array} spotTides - Array of tide objects with {time, type, height}
 * @param {Set} usedTides - Set of already-used tide timestamps
 * @returns {Object|null} Tide object or null
 */
export function findTideForSlot(slotTimestamp, nextSlotTimestamp, spotTides, usedTides) {
  if (!spotTides || spotTides.length === 0) return null;
  
  let bestTide = null;
  let bestDiff = Infinity;
  
  spotTides.forEach(tide => {
    // Skip if already used
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
    // Check if tide is before current slot (within 3 hours)
    else if (tideTime < slotTimestamp) {
      const diff = slotTimestamp - tideTime;
      if (diff <= 3 * 60 * 60 * 1000 && diff < bestDiff) {
        bestDiff = diff;
        bestTide = tide;
      }
    }
  });
  
  if (bestTide) {
    usedTides.add(bestTide.time);
    return {
      ...bestTide,
      type: bestTide.type || (bestTide.height > 2 ? 'high' : 'low')
    };
  }
  
  return null;
}

/**
 * Collect and format tides from forecast slots.
 * 
 * @param {Object} spotsData - Object mapping spotId to array of slots
 * @returns {Object} Object mapping spotId to {spotName, tides} objects
 */
export function collectTidesBySpot(spotsData) {
  const tidesBySpot = {};
  
  Object.keys(spotsData).forEach(spotId => {
    if (spotId === '_tides') return;
    
    const spotSlots = spotsData[spotId];
    const spotTides = spotSlots
      .filter(s => s.tideTime && s.tideType)
      .map(s => ({
        time: s.tideTime,
        type: s.tideType,
        height: s.tideHeight,
      }))
      .filter((tide, index, self) => 
        index === self.findIndex(t => t.time === tide.time)
      );
    
    if (spotTides.length > 0) {
      const spotName = spotSlots.find(s => s.spotName)?.spotName 
        || spotSlots[0]?.spotName 
        || "Unknown Spot";
      
      tidesBySpot[spotId] = {
        spotName,
        tides: spotTides.map(tide => {
          const date = new Date(tide.time);
          return {
            ...tide,
            timeStr: formatTideTime(date)
          };
        }).sort((a, b) => a.time - b.time)
      };
    }
  });
  
  return tidesBySpot;
}

