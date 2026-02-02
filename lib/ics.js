/**
 * ICS (iCalendar) generation utilities
 * RFC 5545 compliant
 */

/**
 * Escape special characters in ICS text fields
 */
function escapeICSText(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Fold long lines according to RFC 5545 (max 75 chars per line)
 */
function foldICSLines(field, value) {
  const maxLength = 75;
  const prefix = `${field}:`;
  const availableLength = maxLength - prefix.length;
  
  if (value.length <= availableLength) {
    return [`${prefix}${value}`];
  }
  
  const lines = [];
  let remaining = value;
  let isFirst = true;
  
  while (remaining.length > 0) {
    if (isFirst) {
      const chunk = remaining.substring(0, availableLength);
      lines.push(`${prefix}${chunk}`);
      remaining = remaining.substring(availableLength);
      isFirst = false;
    } else {
      const chunk = remaining.substring(0, maxLength - 1);
      lines.push(` ${chunk}`); // Space for folding continuation
      remaining = remaining.substring(maxLength - 1);
    }
  }
  
  return lines;
}

/**
 * Format date for ICS (UTC format: YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(timestamp) {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Convert degrees to cardinal direction
 */
function degreesToCardinal(degrees) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Convert stored wind direction (FROM) to display direction (TO)
 * Wind is stored as "from" direction but should be displayed as "to" direction (180° opposite)
 */
function getDisplayWindCardinal(degrees) {
  return degreesToCardinal((degrees + 180) % 360);
}

/**
 * Format event summary (title)
 * Examples:
 * - "Costa da Caparica - 21kt ESE [epic]"
 * - "Carcavelos - 1.2m 12s SW [ideal]"
 */
export function formatEventSummary(event) {
  const quality = event.score >= 90 ? 'epic' : 'ideal';
  // Wind direction is stored as "from" but displayed as "to" (180° opposite)
  const cardinal = getDisplayWindCardinal(event.conditions.direction);
  
  let conditions = '';
  if (event.sport === 'wingfoil') {
    conditions = `${Math.round(event.conditions.speed)}kt ${cardinal}`;
  } else {
    // Surfing
    const height = event.conditions.waveHeight 
      ? `${event.conditions.waveHeight.toFixed(1)}m` 
      : '';
    const period = event.conditions.wavePeriod 
      ? `${Math.round(event.conditions.wavePeriod)}s` 
      : '';
    const waveCardinal = event.conditions.waveDirection 
      ? degreesToCardinal(event.conditions.waveDirection) 
      : cardinal;
    conditions = `${height} ${period} ${waveCardinal}`.trim();
  }
  
  return `${event.spotName} - ${conditions} [${quality}]`;
}

/**
 * Format date for day parameter (e.g., "Mon, Jan 1")
 */
function formatDayParam(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format event description (detailed conditions)
 */
export function formatEventDescription(event) {
  const lines = [];
  
  lines.push(`Score: ${event.score}/100`);
  lines.push('');
  lines.push('Conditions:');
  
  const cardinal = degreesToCardinal(event.conditions.direction);
  lines.push(`• Wind: ${Math.round(event.conditions.speed)} knots`);
  lines.push(`• Gusts: ${Math.round(event.conditions.gust)} knots`);
  lines.push(`• Direction: ${event.conditions.direction}° (${cardinal})`);
  
  if (event.conditions.waveHeight) {
    lines.push(`• Waves: ${event.conditions.waveHeight.toFixed(1)}m`);
  }
  
  if (event.conditions.wavePeriod) {
    lines.push(`• Period: ${Math.round(event.conditions.wavePeriod)}s`);
  }
  
  if (event.conditions.waveDirection) {
    const waveCardinal = degreesToCardinal(event.conditions.waveDirection);
    lines.push(`• Wave Direction: ${event.conditions.waveDirection}° (${waveCardinal})`);
  }
  
  lines.push('');
  lines.push(event.reasoning);
  lines.push('');
  
  // Create link to specific timeslot
  const sportPath = event.sport === 'wingfoil' ? 'wing' : 'surf';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://waterman.radx.dev';
  const dayParam = formatDayParam(event.timestamp);
  const slotParam = event.slotId || event.timestamp;
  const forecastUrl = `${appUrl}/${sportPath}/best?day=${encodeURIComponent(dayParam)}&slot=${slotParam}`;
  lines.push(`View forecast: ${forecastUrl}`);
  
  // Join with actual newlines - escapeICSText will convert them to \\n for ICS format
  return lines.join('\n');
}

/**
 * Format location (spot name + country)
 */
export function formatLocation(event) {
  if (event.country) {
    return `${event.spotName}, ${event.country}`;
  }
  return event.spotName;
}

/**
 * Generate ICS (iCalendar) content from event data
 * 
 * @param {Object} params
 * @param {Array} params.events - Array of event objects
 * @param {string} params.calendarName - Calendar display name
 * @param {string} params.calendarDescription - Calendar description
 * @returns {string} ICS file content
 */
export function generateICS({ events, calendarName, calendarDescription }) {
  const lines = [];
  
  // VCALENDAR header
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Waterman//Forecast Calendar//EN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  lines.push(`X-WR-CALNAME:${escapeICSText(calendarName)}`);
  lines.push(`X-WR-CALDESC:${escapeICSText(calendarDescription)}`);
  lines.push('X-WR-TIMEZONE:UTC');
  lines.push('REFRESH-INTERVAL;VALUE=DURATION:PT1H');
  lines.push('X-PUBLISHED-TTL:PT1H');
  
  // Add events
  for (const event of events) {
    const uid = `${event.spotId}-${event.timestamp}-${event.sport}@waterman.app`;
    const dtstart = formatICSDate(event.timestamp);
    const dtend = formatICSDate(event.timestamp + 90 * 60 * 1000); // 1.5 hours
    const dtstamp = formatICSDate(Date.now());
    const summary = escapeICSText(formatEventSummary(event));
    const description = escapeICSText(formatEventDescription(event));
    const location = escapeICSText(formatLocation(event));
    const sportName = event.sport === 'wingfoil' ? 'Wingfoiling' : 'Surfing';
    
    // Create URL to specific timeslot
    const sportPath = event.sport === 'wingfoil' ? 'wing' : 'surf';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://waterman.radx.dev';
    const dayParam = formatDayParam(event.timestamp);
    const slotParam = event.slotId || event.timestamp;
    const url = `${appUrl}/${sportPath}/best?day=${encodeURIComponent(dayParam)}&slot=${slotParam}`;
    
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART:${dtstart}`);
    lines.push(`DTEND:${dtend}`);
    
    // Fold summary if needed
    const summaryLines = foldICSLines('SUMMARY', summary);
    lines.push(...summaryLines);
    
    // Fold description if needed
    const descriptionLines = foldICSLines('DESCRIPTION', description);
    lines.push(...descriptionLines);
    
    // Fold location if needed
    const locationLines = foldICSLines('LOCATION', location);
    lines.push(...locationLines);
    
    lines.push(`URL:${url}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:TRANSPARENT');
    lines.push(`CATEGORIES:${sportName}`);
    lines.push('END:VEVENT');
  }
  
  // VCALENDAR footer
  lines.push('END:VCALENDAR');
  
  return lines.join('\r\n');
}
