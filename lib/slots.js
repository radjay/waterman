/**
 * Slot enrichment and processing utilities.
 * Uses LLM scores exclusively - no heuristic-based criteria matching.
 */

import { formatTime, formatFullDay } from "./utils";
import { isTideOnlySlot } from "./tides";

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
    let score = null;
    let matchedSport = null;
    let bestScore = -1;
    
    for (const sport of relevantSports) {
      const key = `${slot._id}_${sport}`;
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
 * Mark ideal slots for each day/spot combination.
 * Uses LLM scores exclusively - score >= 75 = ideal (per PRD 02: "75-89: Excellent conditions (ideal)").
 * 
 * @param {Object} grouped - Object mapping day strings to spot data
 * @param {Array<string>} selectedSports - Currently selected sports (unused, kept for API compatibility)
 */
export function markIdealSlots(grouped, selectedSports) {
  Object.keys(grouped).forEach((day) => {
    Object.keys(grouped[day]).forEach((spotId) => {
      // Skip tide-only entries for ideal slot calculation
      if (spotId === '_tides') return;
      
      const slots = grouped[day][spotId];
      slots.sort((a, b) => a.timestamp - b.timestamp);

      // Filter to slots with scores >= 75 (ideal threshold per PRD 02)
      const scoredSlots = slots.filter(s => 
        !s.isTideOnly && 
        s.score && 
        s.score.value >= 75
      );
      
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
