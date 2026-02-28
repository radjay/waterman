import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { generateICS } from "../../../../../lib/ics";
import { isDaylightSlot } from "../../../../../lib/daylight";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export async function GET(request, { params }) {
  try {
    // Await params (Next.js 15+ requirement)
    const resolvedParams = await params;
    
    // Get sport from URL path parameter
    const sportParam = resolvedParams?.sport || "wingfoil";
    
    // Validate sport parameter
    const validSports = ["wingfoil", "kitesurfing", "surfing"];
    const sport = validSports.includes(sportParam) ? sportParam : "wingfoil";
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token") || undefined;
    const spotsParam = searchParams.get("spots");
    const spotIds = spotsParam ? spotsParam.split(",") : undefined;
    
    // Get feed data from Convex
    const feedData = await client.query(api.calendar.getSportFeed, {
      sport,
      token,
      spotIds,
    });

    // Filter events to only include daylight hours
    const daylightEvents = feedData.events.filter((event) => {
      const timestamp = new Date(event.timestamp);
      const spot = {
        latitude: event.latitude,
        longitude: event.longitude,
      };
      return isDaylightSlot(timestamp, spot);
    });

    // Generate calendar name and description
    const sportName = sport === "wingfoil" ? "Wingfoiling" : sport === "kitesurfing" ? "Kitesurfing" : "Surfing";
    const calendarName = feedData.metadata.isPersonalized
      ? `Waterman ${sportName} - Your Spots`
      : `Waterman ${sportName}`;
    const calendarDescription = feedData.metadata.isPersonalized
      ? `Best ${sportName.toLowerCase()} sessions at your favorite spots`
      : `Best ${sportName.toLowerCase()} sessions`;

    // Generate ICS content
    const icsContent = generateICS({
      events: daylightEvents,
      calendarName,
      calendarDescription,
    });

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename=waterman-${sport}.ics`,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Error generating calendar feed:", error);
    return new NextResponse("Error generating calendar feed", { status: 500 });
  }
}
