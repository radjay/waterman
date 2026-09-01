export const getRealDate = (dayStr) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dayStr.toUpperCase() === "TODAY") {
    return today
      .toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
      .toUpperCase();
  }
  if (dayStr.toUpperCase() === "TOMORROW") {
    return tomorrow
      .toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
      .toUpperCase();
  }
  return dayStr;
};

export const getCardinalDirection = (degrees) => {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  // Normalize degrees to 0-360 range
  const normalizedDegrees = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalizedDegrees / 22.5) % 16;
  return directions[index];
};

/**
 * Compass label for a stored wind bearing. Forecast slots store the direction
 * energy travels TO; the label prints where it comes FROM (+180).
 */
export const getDisplayWindDirection = (degrees) => {
  return getCardinalDirection(degrees + 180);
};

/**
 * Compass label for a live Windguru station reading. The iAPI reports
 * meteorological FROM bearings; normalize to the TO storage forecast uses,
 * then run the shared getDisplayWindDirection flip so live badges match
 * WindLine / day-card labels.
 */
export const getLiveWindDirectionLabel = (fromDegrees) =>
  getDisplayWindDirection((fromDegrees + 180) % 360);

export const formatDate = (date) => {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export const formatTime = (date) => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export const formatFullDate = (date) => {
  return date
    .toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();
};

/**
 * Format a timestamp as HH:MM time string.
 * 
 * @param {number|Date} timestamp - Timestamp (ms) or Date object
 * @returns {string} Formatted time string (e.g., "14:30")
 */
export function formatTideTime(timestamp) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format a date as a full day string (e.g., "Monday, January 1").
 * 
 * @param {number|Date} timestamp - Timestamp (ms) or Date object
 * @returns {string} Formatted day string
 */
export function formatFullDay(timestamp) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

