/**
 * Slot enrichment and processing utilities.
 */

import { formatTime, formatFullDay } from "./utils";
import { isEpicConditions, matchesWingfoilCriteria, matchesSurfingCriteria } from "./criteria";
import { isTideOnlySlot } from "./tides";
import { findIdealSlot } from "./criteria";

/**
 * Enrich forecast slots with formatted data and criteria matching.
 * 
 * @param {Array} slots - Raw forecast slots from database
 * @param {Object} spot - Spot object
 * @param {Array} configs - Array of spot configs (one per sport)
 * @returns {Array} Enriched slots with matching criteria, sport, etc.
 */
export function enrichSlots(slots, spot, configs) {
  return slots.map((slot) => {
    const date = new Date(slot.timestamp);
    const hourStr = formatTime(date);
    const isEpic = isEpicConditions(slot);
    const isTideOnly = isTideOnlySlot(slot);
    
    // Check if slot matches criteria
    let matchesCriteria = false;
    let matchedSport = null;
    
    if (!isTideOnly) {
      for (const config of configs) {
        if (!config) continue;
        
        if (config.sport === "wingfoil") {
          if (matchesWingfoilCriteria(slot, config)) {
            matchesCriteria = true;
            matchedSport = "wingfoil";
            break;
          }
        } else if (config.sport === "surfing") {
          if (matchesSurfingCriteria(slot, config)) {
            matchesCriteria = true;
            matchedSport = "surfing";
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
      isTideOnly,
      matchesCriteria: matchesCriteria || isTideOnly,
    };
  });
}

/**
 * Filter and sort days, removing past dates.
 * 
 * @param {Object} grouped - Object mapping day strings to spot data
 * @returns {Array} Sorted array of day strings (today and future only)
 */
export function filterAndSortDays(grouped) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return Object.keys(grouped)
    .filter((day) => {
      const firstSlot = grouped[day][Object.keys(grouped[day])[0]]?.[0];
      if (!firstSlot) return false;
      
      const slotDate = new Date(firstSlot.timestamp);
      slotDate.setHours(0, 0, 0, 0);
      
      return slotDate >= today;
    })
    .sort((a, b) => {
      const firstSlotA = grouped[a][Object.keys(grouped[a])[0]]?.[0];
      const firstSlotB = grouped[b][Object.keys(grouped[b])[0]]?.[0];
      if (!firstSlotA || !firstSlotB) return 0;
      return firstSlotA.timestamp - firstSlotB.timestamp;
    });
}

/**
 * Mark ideal slots for each day/spot combination.
 * 
 * @param {Object} grouped - Object mapping day strings to spot data
 * @param {Array<string>} selectedSports - Currently selected sports
 */
export function markIdealSlots(grouped, selectedSports) {
  Object.keys(grouped).forEach((day) => {
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
        const sport = isSurfingSpot ? "surfing" : "wingfoil";
        
        const idealSlot = findIdealSlot(matchingSlots, sport);
        
        if (idealSlot) {
          idealSlot.isIdeal = true;
        }
      }
    });
  });
}


