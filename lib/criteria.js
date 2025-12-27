/**
 * Criteria matching utilities for forecast slots.
 * Handles sport-specific condition matching (wingfoiling, surfing).
 */

/**
 * Check if a direction (in degrees 0-360) falls within a range.
 * Handles wrap-around cases (e.g., 315° → 135° crosses 0°).
 * 
 * @param {number} direction - Direction to check (0-360)
 * @param {number} from - Range start (0-360)
 * @param {number} to - Range end (0-360)
 * @returns {boolean} True if direction is within range
 */
export function isDirectionInRange(direction, from, to) {
  if (from === undefined || to === undefined) {
    return true; // No direction filter
  }
  
  if (from <= to) {
    // Normal range (e.g., 90-180)
    return direction >= from && direction <= to;
  } else {
    // Wrap-around range (e.g., 315-135 crosses 0°)
    return direction >= from || direction <= to;
  }
}

/**
 * Check if a slot matches wingfoiling criteria.
 * 
 * @param {Object} slot - Forecast slot
 * @param {Object} config - Spot configuration for wingfoiling
 * @returns {boolean} True if slot matches criteria
 */
export function matchesWingfoilCriteria(slot, config) {
  const isSpeed = slot.speed >= (config.minSpeed || 0);
  const isGust = slot.gust >= (config.minGust || 0);
  
  return isSpeed && isGust;
}

/**
 * Check if a slot matches surfing criteria.
 * 
 * @param {Object} slot - Forecast slot
 * @param {Object} config - Spot configuration for surfing
 * @returns {boolean} True if slot matches criteria
 */
export function matchesSurfingCriteria(slot, config) {
  const hasSwell = slot.waveHeight >= (config.minSwellHeight || 0);
  const maxSwell = config.maxSwellHeight 
    ? slot.waveHeight <= config.maxSwellHeight 
    : true;
  const hasPeriod = slot.wavePeriod >= (config.minPeriod || 0);
  
  // Tide check
  let isTide = true;
  if (config.optimalTide && slot.tideType) {
    if (config.optimalTide === "high") {
      isTide = slot.tideType === "high";
    } else if (config.optimalTide === "low") {
      isTide = slot.tideType === "low";
    }
    // "both" means any tide is fine
  }
  
  return hasSwell && maxSwell && hasPeriod && isTide;
}

/**
 * Check if a slot represents "epic" conditions.
 * Epic = high wind speed (≥20 knots) with steady wind (gust - speed ≤ 10 knots).
 * 
 * @param {Object} slot - Forecast slot
 * @returns {boolean} True if slot is epic
 */
export function isEpicConditions(slot) {
  return slot.speed >= 20 && (slot.gust - slot.speed) <= 10;
}

/**
 * Find the ideal slot from a list of matching slots.
 * 
 * @param {Array} matchingSlots - Slots that match criteria
 * @param {string} sport - Sport type ("wingfoil" or "surfing")
 * @returns {Object|null} Ideal slot or null
 */
export function findIdealSlot(matchingSlots, sport) {
  if (matchingSlots.length === 0) return null;
  
  if (sport === "surfing") {
    // For surfing: find best wave quality (height * period as quality metric)
    const bestWave = Math.max(
      ...matchingSlots.map(s => (s.waveHeight || 0) * (s.wavePeriod || 0))
    );
    return matchingSlots.find(
      s => (s.waveHeight || 0) * (s.wavePeriod || 0) === bestWave
    );
  } else {
    // For wingfoil: find max speed slot
    const maxSpeed = Math.max(...matchingSlots.map(s => s.speed || 0));
    return matchingSlots.find(s => s.speed === maxSpeed);
  }
}

