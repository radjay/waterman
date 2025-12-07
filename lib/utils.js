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
 * Get display wind direction from stored wind direction
 * Wind direction is stored as "from" direction, but displayed as "to" direction (180° opposite)
 * This ensures consistent display across the app
 */
export const getDisplayWindDirection = (degrees) => {
  return getCardinalDirection(degrees + 180);
};

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

