import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { getCardinalDirection, getDisplayWindDirection, formatTime, formatTideTime } from "../../../../lib/utils";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

// Helper to format date for iCal
function formatICalDate(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// Helper to escape text for iCal
function escapeICalText(text) {
  if (!text) return "";
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}


// formatTime is now imported from utils

export async function GET(request, { params }) {
  try {
    // Get sport from URL path parameter
    const sportParam = params?.sport || "wingfoil";
    
    // Validate sport parameter
    const validSports = ["wingfoil", "surfing"];
    const sport = validSports.includes(sportParam) ? sportParam : "wingfoil";
    
    // Get ideal slots from Convex for the specific sport
    const idealSlots = await client.query(api.calendar.getIdealSlots, {
      sports: [sport],
    });

    // Generate iCal content
    const lines = [];
    
    // iCal header
    lines.push("BEGIN:VCALENDAR");
    lines.push("VERSION:2.0");
    lines.push("PRODID:-//Waterman//Ideal Conditions Calendar//EN");
    lines.push("CALSCALE:GREGORIAN");
    lines.push("METHOD:PUBLISH");
    const sportName = sport === "wingfoil" ? "Wingfoil" : "Surfing";
    lines.push(`X-WR-CALNAME:Waterman ${sportName} Ideal Conditions`);
    lines.push(`X-WR-CALDESC:Calendar feed for ideal ${sportName.toLowerCase()} conditions`);
    lines.push("X-WR-TIMEZONE:UTC");

    // Generate events for each ideal slot
    idealSlots.forEach((slot, index) => {
      const startDate = new Date(slot.timestamp);
      // Each slot is typically 1 hour, but we'll make it 2 hours for better visibility
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
      
      const spotName = slot.spot.name;
      const slotSport = slot.matchedSport || "watersports";
      // Use the same utility function as the web app for consistent wind direction display
      const windDir = getDisplayWindDirection(slot.direction);
      
      // Build description with condition details
      const descriptionParts = [];
      descriptionParts.push(`Spot: ${spotName}`);
      descriptionParts.push(`Sport: ${slotSport}`);
      descriptionParts.push(`Wind: ${slot.speed}kt (${slot.gust}kt gusts) from ${windDir}`);
      
      if (slot.waveHeight !== undefined && slot.waveHeight > 0) {
        descriptionParts.push(`Waves: ${slot.waveHeight.toFixed(1)}m @ ${slot.wavePeriod}s from ${getCardinalDirection(slot.waveDirection || 0)}`);
      }
      
      if (slot.tideType) {
        const tideTime = slot.tideTime ? formatTideTime(slot.tideTime) : "";
        const tideHeight = slot.tideHeight !== undefined ? `${slot.tideHeight.toFixed(1)}m` : "";
        descriptionParts.push(`Tide: ${slot.tideType} ${tideTime} ${tideHeight}`.trim());
      }
      
      // Join with actual newline, then escape
      // escapeICalText will convert actual newlines to \n (backslash-n) for iCal format
      const descriptionWithNewlines = descriptionParts.join("\n");
      const summary = `${spotName} - ${slotSport.charAt(0).toUpperCase() + slotSport.slice(1)}`;
      
      // Generate unique ID for event
      const uid = `waterman-${slot.spot._id}-${slot.timestamp}@waterman.app`;
      
      // Helper to fold long lines (iCal requires lines to be max 75 chars, folded with space)
      function foldICalLine(field, value) {
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
      
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid}`);
      lines.push(`DTSTART:${formatICalDate(startDate)}`);
      lines.push(`DTEND:${formatICalDate(endDate)}`);
      lines.push(`DTSTAMP:${formatICalDate(new Date())}`);
      
      // Fold summary
      const summaryLines = foldICalLine("SUMMARY", escapeICalText(summary));
      lines.push(...summaryLines);
      
      // Fold description - join with actual newline, then escape
      const descForICal = escapeICalText(descriptionWithNewlines);
      const descLines = foldICalLine("DESCRIPTION", descForICal);
      lines.push(...descLines);
      
      // Fold location
      const locationLines = foldICalLine("LOCATION", escapeICalText(spotName));
      lines.push(...locationLines);
      
      lines.push("STATUS:CONFIRMED");
      lines.push("SEQUENCE:0");
      lines.push("END:VEVENT");
    });

    // iCal footer
    lines.push("END:VCALENDAR");

    const icalContent = lines.join("\r\n");

    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename=waterman-${sport}-calendar.ics`,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Error generating calendar feed:", error);
    return new NextResponse("Error generating calendar feed", { status: 500 });
  }
}

