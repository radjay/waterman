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
 * Find tide information for a forecast slot period.
 * 
 * Priority:
 * 1. If a high/low tide occurs WITHIN the slot period, return it with exact time
 * 2. Otherwise, determine if tide is rising or falling during the slot period
 * 
 * @param {number} slotTimestamp - Forecast slot timestamp (start of period)
 * @param {number|null} nextSlotTimestamp - Next slot timestamp (end of period)
 * @param {Array} spotTides - Array of tide objects with {time, type, height}, sorted by time
 * @param {Set} usedTides - Set of already-used tide timestamps
 * @returns {Object|null} Tide object with exact time if event occurs, or trend info
 */
/**
 * Check if a tide point is an actual high/low peak/trough by comparing with neighbors.
 * A high tide peak is a local maximum (higher than neighbors).
 * A low tide trough is a local minimum (lower than neighbors).
 */
function isActualTideEvent(tide, index, sortedTides) {
  if (sortedTides.length < 3) {
    // Need at least 3 points to determine a peak/trough
    // For 1-2 points, consider them all as potential events
    return true;
  }
  
  const prevTide = index > 0 ? sortedTides[index - 1] : null;
  const nextTide = index < sortedTides.length - 1 ? sortedTides[index + 1] : null;
  
  if (tide.type === 'high') {
    // High tide: must be higher than both neighbors (or at least one if at boundary)
    if (prevTide && nextTide) {
      return tide.height > prevTide.height && tide.height > nextTide.height;
    } else if (prevTide) {
      return tide.height > prevTide.height;
    } else if (nextTide) {
      return tide.height > nextTide.height;
    }
    return true; // Single point, consider it valid
  } else if (tide.type === 'low') {
    // Low tide: must be lower than both neighbors (or at least one if at boundary)
    if (prevTide && nextTide) {
      return tide.height < prevTide.height && tide.height < nextTide.height;
    } else if (prevTide) {
      return tide.height < prevTide.height;
    } else if (nextTide) {
      return tide.height < nextTide.height;
    }
    return true; // Single point, consider it valid
  }
  
  return false;
}

export function findTideForSlot(slotTimestamp, nextSlotTimestamp, spotTides, usedTides) {
  if (!spotTides || spotTides.length === 0) return null;
  
  const slotEnd = nextSlotTimestamp || (slotTimestamp + 3 * 60 * 60 * 1000); // Default 3h period
  
  // Sort tides by time to enable neighbor comparison
  const sortedTides = [...spotTides].sort((a, b) => a.time - b.time);
  
  // First, check if an actual high/low tide peak/trough occurs WITHIN the slot period
  // Since the scraper now only stores actual peaks and troughs, we can simply
  // look for any tide event that falls within the slot period
  let tideInSlot = null;
  
  // Find any high/low tide event that falls within the slot period
  // Use exclusive end boundary to avoid double-matching tides at slot boundaries
  // (a tide at exactly slotEnd belongs to the next slot)
  for (const tide of sortedTides) {
    const tideTime = tide.time;
    
    // Check if tide falls within the slot period (inclusive start, exclusive end)
    // This ensures a tide at exactly slotEnd (e.g., 12:00) goes to the next slot
    if (tideTime >= slotTimestamp && tideTime < slotEnd) {
      // Found a tide event within the slot
      // Since we only store actual peaks/troughs, we can trust the type
      if (tide.type && (tide.type === 'high' || tide.type === 'low')) {
        // Ensure we don't use the same tide event for multiple slots
        if (!usedTides.has(tide.time)) {
          tideInSlot = tide;
          break; // Take the first one found within the slot
        }
      }
    }
  }
  
  // If we found a tide event within the slot, return it with exact time
  if (tideInSlot) {
    usedTides.add(tideInSlot.time);
    const timeStr = tideInSlot.timeStr || formatTideTime(tideInSlot.time);
    return {
      ...tideInSlot,
      time: tideInSlot.time,
      timeStr: timeStr,
      type: tideInSlot.type || (tideInSlot.height > 0 ? 'high' : 'low'),
      isExactTime: true, // Flag to indicate this is an exact tide event
    };
  }
  
  // No tide event in slot - determine if rising or falling
  // Find the nearest tide events before and after the slot period to determine trend
  // (sortedTides is already defined above)
  let tideBefore = null;
  let tideAfter = null;
  
  // Find the last tide at or before slot start (closest reference point)
  for (let i = sortedTides.length - 1; i >= 0; i--) {
    if (sortedTides[i].time <= slotTimestamp) {
      tideBefore = sortedTides[i];
      break;
    }
  }
  
  // Find the first tide at or after slot end (closest reference point)
  for (let i = 0; i < sortedTides.length; i++) {
    if (sortedTides[i].time >= slotEnd) {
      tideAfter = sortedTides[i];
      break;
    }
  }
  
  // Determine trend based on heights of nearest tide events
  if (tideBefore && tideAfter) {
    // Compare heights to determine if rising or falling
    const isRising = tideAfter.height > tideBefore.height;
    return {
      isRising,
      isFalling: !isRising,
      isExactTime: false, // This is a trend, not an exact event
      // No time or height for trends - just the icon
    };
  }
  
  // If we only have tide before, infer trend from type
  if (tideBefore) {
    // If it's a low tide, next will be rising; if high, next will be falling
    const isLow = tideBefore.type === 'low' || tideBefore.height < 0;
    const isRising = isLow; // After low tide, it rises
    return {
      isRising,
      isFalling: !isRising,
      isExactTime: false,
      // No time or height for trends
    };
  }
  
  // If we only have tide after, infer trend from type
  if (tideAfter) {
    // If it's a high tide, previous was rising; if low, previous was falling
    const isHigh = tideAfter.type === 'high' || tideAfter.height > 0;
    const isRising = isHigh; // Before high tide, it rises
    return {
      isRising,
      isFalling: !isRising,
      isExactTime: false,
      // No time or height for trends
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
        time: s.tideTime, // Use the actual tide time (not slot timestamp)
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

