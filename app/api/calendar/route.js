import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

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

// Helper to get cardinal direction
function getCardinalDirection(degrees) {
  const directions = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

// Helper to format time
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export async function GET(request) {
  try {
    // Get ideal slots from Convex
    const idealSlots = await client.query(api.calendar.getIdealSlots, {
      sports: ["wingfoil", "surfing"], // Default sports
    });

    // Generate iCal content
    const lines = [];
    
    // iCal header
    lines.push("BEGIN:VCALENDAR");
    lines.push("VERSION:2.0");
    lines.push("PRODID:-//Waterman//Ideal Conditions Calendar//EN");
    lines.push("CALSCALE:GREGORIAN");
    lines.push("METHOD:PUBLISH");
    lines.push("X-WR-CALNAME:Waterman Ideal Conditions");
    lines.push("X-WR-CALDESC:Calendar feed for ideal watersports conditions");
    lines.push("X-WR-TIMEZONE:UTC");

    // Generate events for each ideal slot
    idealSlots.forEach((slot, index) => {
      const startDate = new Date(slot.timestamp);
      // Each slot is typically 1 hour, but we'll make it 2 hours for better visibility
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
      
      const spotName = slot.spot.name;
      const sport = slot.matchedSport || "watersports";
      const windDir = getCardinalDirection(slot.direction);
      
      // Build description with condition details
      const descriptionParts = [];
      descriptionParts.push(`Spot: ${spotName}`);
      descriptionParts.push(`Sport: ${sport}`);
      descriptionParts.push(`Wind: ${slot.speed}kt (${slot.gust}kt gusts) from ${windDir}`);
      
      if (slot.waveHeight !== undefined && slot.waveHeight > 0) {
        descriptionParts.push(`Waves: ${slot.waveHeight.toFixed(1)}m @ ${slot.wavePeriod}s from ${getCardinalDirection(slot.waveDirection || 0)}`);
      }
      
      if (slot.tideType) {
        const tideTime = slot.tideTime ? formatTime(slot.tideTime) : "";
        const tideHeight = slot.tideHeight !== undefined ? `${slot.tideHeight.toFixed(1)}m` : "";
        descriptionParts.push(`Tide: ${slot.tideType} ${tideTime} ${tideHeight}`.trim());
      }
      
      const description = descriptionParts.join("\\n");
      const summary = `${spotName} - ${sport.charAt(0).toUpperCase() + sport.slice(1)}`;
      
      // Generate unique ID for event
      const uid = `waterman-${slot.spot._id}-${slot.timestamp}@waterman.app`;
      
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid}`);
      lines.push(`DTSTART:${formatICalDate(startDate)}`);
      lines.push(`DTEND:${formatICalDate(endDate)}`);
      lines.push(`DTSTAMP:${formatICalDate(new Date())}`);
      lines.push(`SUMMARY:${escapeICalText(summary)}`);
      lines.push(`DESCRIPTION:${escapeICalText(description)}`);
      lines.push(`LOCATION:${escapeICalText(spotName)}`);
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
        "Content-Disposition": "attachment; filename=waterman-calendar.ics",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Error generating calendar feed:", error);
    return new NextResponse("Error generating calendar feed", { status: 500 });
  }
}

