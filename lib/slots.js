/**
 * Slot enrichment and processing utilities.
 * Uses LLM scores exclusively - no heuristic-based criteria matching.
 */

import { formatTime, formatFullDay } from "./utils";
import { isTideOnlySlot } from "./tides";
import { isContextualSlot, isAfterSunset, sunsetOccursInFirstHalfOfSlot } from "./daylight";

/**
 * Enrich forecast slots with formatted data and LLM scores.
 * 
 * @param {Array} slots - Raw forecast slots from database
 * @param {Object} spot - Spot object
 * @param {Array} configs - Array of spot configs (unused, kept for API compatibility)
 * @param {Object} scoresMap - Map of slotId_sport -> score object
 * @param {Array} relevantSports - Array of sports to check for scores
 * @returns {Array} Enriched slots with score, sport (from score), etc.
 */
export function enrichSlots(slots, spot, configs, scoresMap = {}, relevantSports = []) {
  return slots.map((slot) => {
    const date = new Date(slot.timestamp);
    const hourStr = formatTime(date);
    const isTideOnly = isTideOnlySlot(slot);
    
    // Find score for this slot (check all relevant sports)
    // Determine sport from the score (which sport has the best score for this slot)
    // Use timestamp as the key because slot IDs change with each scrape
    let score = null;
    let matchedSport = null;
    let bestScore = -1;
    
    for (const sport of relevantSports) {
      const key = `${slot.timestamp}_${sport}`;
      if (scoresMap[key]) {
        const currentScore = scoresMap[key];
        // Use the sport with the highest score for this slot
        if (currentScore.score > bestScore) {
          bestScore = currentScore.score;
          score = currentScore;
          matchedSport = sport;
        }
      }
    }
    
    // Epic conditions: score >= 90 (per PRD 02: "90-100: Exceptional conditions (epic)")
    const isEpic = score && score.score >= 90;
    
    return {
      ...slot,
      spotName: spot.name,
      spotId: slot.spotId, // Use the slot's spotId field, not slot._id
      hour: hourStr,
      isEpic,
      sport: matchedSport,
      isTideOnly,
      matchesCriteria: false, // Deprecated - always false, use score instead
      score: score ? {
        value: score.score,
        reasoning: score.reasoning,
        factors: score.factors,
        isPersonalized: score.userId !== null && score.userId !== undefined,
      } : null,
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
 * Mark contextual slots for each day/spot combination.
 * Contextual slots are one before sunrise (surfing) or one after sunset (windsports).
 * 
 * @param {Object} grouped - Object mapping day strings to spot data
 * @param {Object} spotsMap - Map of spotId -> spot object
 * @param {Array<string>} selectedSports - Currently selected sports
 */
export function markContextualSlots(grouped, spotsMap, selectedSports) {
  Object.keys(grouped).forEach((day) => {
    Object.keys(grouped[day]).forEach((spotId) => {
      // Skip tide-only entries
      if (spotId === '_tides') return;
      
      const spot = spotsMap[spotId];
      if (!spot) return;
      
      const slots = grouped[day][spotId];
      if (!slots || slots.length === 0) return;
      
      // Check each selected sport for contextual slots
      for (const sport of selectedSports) {
        const isSurfing = sport === 'surfing';
        
        if (isSurfing) {
          // For surfing: always show the closest slot before sunrise
          slots.forEach(slot => {
            if (isContextualSlot(new Date(slot.timestamp), spot, sport, slots)) {
              slot.isContextual = true;
              slot.contextualSport = sport;
            }
          });
        } else {
          // For windsports: check if sunset is in first half of any slot
          const slotWithSunsetInFirstHalf = slots.find(slot => 
            sunsetOccursInFirstHalfOfSlot(new Date(slot.timestamp), spot)
          );
          
          if (slotWithSunsetInFirstHalf) {
            // If sunset is in first half of a slot, that's the contextual slot
            // Don't also show the closest slot after sunset (prevents showing multiple slots)
            slotWithSunsetInFirstHalf.isContextual = true;
            slotWithSunsetInFirstHalf.contextualSport = sport;
          } else {
            // If no slot has sunset in first half, show the closest slot after sunset
            slots.forEach(slot => {
              if (isContextualSlot(new Date(slot.timestamp), spot, sport, slots)) {
                slot.isContextual = true;
                slot.contextualSport = sport;
              }
            });
          }
        }
      }
    });
  });
}

/**
 * Mark ideal slots for each day/spot combination.
 * Uses LLM scores exclusively - score >= 75 = ideal (per PRD 02: "75-89: Excellent conditions (ideal)").
 * Contextual slots and slots that start after sunset are excluded from ideal/best calculations.
 * 
 * @param {Object} grouped - Object mapping day strings to spot data
 * @param {Array<string>} selectedSports - Currently selected sports (unused, kept for API compatibility)
 * @param {Object} spotsMap - Map of spotId -> spot object (for checking sunset times)
 */
export function markIdealSlots(grouped, selectedSports, spotsMap = {}) {
  Object.keys(grouped).forEach((day) => {
    Object.keys(grouped[day]).forEach((spotId) => {
      // Skip tide-only entries for ideal slot calculation
      if (spotId === '_tides') return;
      
      const spot = spotsMap[spotId];
      const slots = grouped[day][spotId];
      slots.sort((a, b) => a.timestamp - b.timestamp);

      // Filter to slots with scores >= 75 (ideal threshold per PRD 02)
      // Exclude contextual slots (including those where sunset is in first half),
      // tide-only slots, and slots that start after sunset
      const scoredSlots = slots.filter(s => {
        if (s.isTideOnly) return false;
        if (s.isContextual) return false; // Exclude contextual slots from ideal/best
        // (This includes slots where sunset occurs in first half, marked in markContextualSlots)
        if (!s.score || s.score.value < 75) return false;
        
        if (!spot) return true; // Can't check sunset without spot coordinates
        
        // Exclude slots that start after sunset (even if they have high scores)
        if (isAfterSunset(new Date(s.timestamp), spot)) return false;
        
        // Note: Slots where sunset occurs in first half are already marked as contextual
        // and excluded above. Slots where sunset is in second half are allowed to be ideal.
        
        return true;
      });
      
      if (scoredSlots.length > 0) {
        // Find the slot with the highest score
        const idealSlot = scoredSlots.reduce((best, current) => {
          if (!best) return current;
          return (current.score.value > best.score.value) ? current : best;
        }, null);
        
        if (idealSlot) {
          idealSlot.isIdeal = true;
        }
      }
    });
  });
}
