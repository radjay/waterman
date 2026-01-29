import { getSunTimes } from './sun.js';

/**
 * Check if a timestamp falls within daylight hours for a given spot
 * @param {Date} timestamp - The slot timestamp
 * @param {Object} spot - Spot object with latitude/longitude
 * @returns {boolean} True if slot is within daylight hours
 */
export function isDaylightSlot(timestamp, spot) {
    if (!spot.latitude || !spot.longitude) {
        // Fallback: hardcoded 8 AM - 5 PM if no coordinates (more conservative)
        // This ensures we don't show slots that are likely after sunset
        const hour = timestamp.getHours();
        return hour >= 8 && hour < 17; // Use < 17 instead of <= 18 to exclude 17:00-18:00
    }
    
    const sunTimes = getSunTimes(spot.latitude, spot.longitude, timestamp);
    return timestamp >= sunTimes.sunrise && timestamp <= sunTimes.sunset;
}

/**
 * Check if a slot should be shown as a contextual slot (one before sunrise for surfing, one after sunset for windsports)
 * @param {Date} timestamp - The slot timestamp
 * @param {Object} spot - Spot object with latitude/longitude
 * @param {string} sport - The sport type ('surfing' or 'wingfoil'/'kitesurfing' etc.)
 * @param {Array} allSlots - All slots for the day (to find adjacent slots)
 * @returns {boolean} True if this is a contextual slot
 */
export function isContextualSlot(timestamp, spot, sport, allSlots) {
    if (!spot.latitude || !spot.longitude) {
        return false; // No contextual slots if no coordinates
    }
    
    const sunTimes = getSunTimes(spot.latitude, spot.longitude, timestamp);
    const isSurfing = sport === 'surfing';
    
    if (isSurfing) {
        // For surfing: show the closest slot before sunrise (regardless of distance)
        const slotsBeforeSunrise = allSlots.filter(s => 
            new Date(s.timestamp) < sunTimes.sunrise
        );
        
        if (slotsBeforeSunrise.length === 0) return false;
        
        // Find the slot closest to sunrise (latest slot before sunrise)
        const closestBeforeSunrise = slotsBeforeSunrise.reduce((closest, current) => {
            return new Date(current.timestamp) > new Date(closest.timestamp) ? current : closest;
        });
        
        return new Date(closestBeforeSunrise.timestamp).getTime() === timestamp.getTime();
    } else {
        // For windsports: show the closest slot after sunset (regardless of distance)
        const slotsAfterSunset = allSlots.filter(s => 
            new Date(s.timestamp) > sunTimes.sunset
        );
        
        if (slotsAfterSunset.length === 0) return false;
        
        // Find the slot closest to sunset (earliest slot after sunset)
        const closestAfterSunset = slotsAfterSunset.reduce((closest, current) => {
            return new Date(current.timestamp) < new Date(closest.timestamp) ? current : closest;
        });
        
        return new Date(closestAfterSunset.timestamp).getTime() === timestamp.getTime();
    }
}

/**
 * Check if a timestamp is after sunset (for filtering out non-contextual slots)
 * @param {Date} timestamp - The slot timestamp
 * @param {Object} spot - Spot object with latitude/longitude
 * @returns {boolean} True if slot is after sunset
 */
export function isAfterSunset(timestamp, spot) {
    if (!spot.latitude || !spot.longitude) {
        // Fallback: assume after sunset if hour >= 18 (6 PM)
        const hour = timestamp.getHours();
        return hour >= 18;
    }
    
    const sunTimes = getSunTimes(spot.latitude, spot.longitude, timestamp);
    return timestamp > sunTimes.sunset;
}

/**
 * Check if sunset occurs during the slot period.
 * Slots are typically 3 hours long, so we check if sunset falls within that window.
 * If sunset occurs during the slot, it's not ideal for a session.
 * 
 * @param {Date} slotTimestamp - The slot start timestamp
 * @param {Object} spot - Spot object with latitude/longitude
 * @param {number} slotDurationHours - Duration of the slot in hours (default: 3)
 * @returns {boolean} True if sunset occurs during the slot period
 */
export function sunsetOccursDuringSlot(slotTimestamp, spot, slotDurationHours = 3) {
    if (!spot.latitude || !spot.longitude) {
        // Fallback: if slot starts at 15:00 (3 PM) or later, assume sunset might occur during slot
        // This is conservative - better to exclude potentially problematic slots
        const hour = slotTimestamp.getHours();
        return hour >= 15; // 3 PM or later
    }
    
    const sunTimes = getSunTimes(spot.latitude, spot.longitude, slotTimestamp);
    const slotStart = slotTimestamp.getTime();
    const slotEnd = slotStart + (slotDurationHours * 60 * 60 * 1000);
    const sunsetTime = sunTimes.sunset.getTime();
    
    // Check if sunset falls within the slot period (inclusive start, exclusive end)
    // If sunset is exactly at slot start, that's fine (slot starts in daylight)
    // If sunset is during the slot (between start and end), that's not ideal
    return sunsetTime > slotStart && sunsetTime < slotEnd;
}

/**
 * Check if sunset occurs in the first half of the slot period.
 * If sunset is in the first half (< 50% through the slot), the slot should be contextual.
 * If sunset is in the second half (>= 50%), the slot can still be ideal.
 * 
 * @param {Date} slotTimestamp - The slot start timestamp
 * @param {Object} spot - Spot object with latitude/longitude
 * @param {number} slotDurationHours - Duration of the slot in hours (default: 3)
 * @returns {boolean} True if sunset occurs in the first half of the slot
 */
export function sunsetOccursInFirstHalfOfSlot(slotTimestamp, spot, slotDurationHours = 3) {
    if (!spot.latitude || !spot.longitude) {
        // Fallback: if slot starts at 15:00 (3 PM) or later, assume sunset might be in first half
        const hour = slotTimestamp.getHours();
        return hour >= 15; // 3 PM or later
    }
    
    const sunTimes = getSunTimes(spot.latitude, spot.longitude, slotTimestamp);
    const slotStart = slotTimestamp.getTime();
    const slotDurationMs = slotDurationHours * 60 * 60 * 1000;
    const slotMidpoint = slotStart + (slotDurationMs / 2);
    const sunsetTime = sunTimes.sunset.getTime();
    
    // Check if sunset falls in the first half of the slot (between start and midpoint)
    // If sunset is exactly at slot start, that's fine (not in first half)
    // If sunset is at or after midpoint, that's fine (second half)
    return sunsetTime > slotStart && sunsetTime < slotMidpoint;
}
