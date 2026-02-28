import { NextResponse } from "next/server";

/**
 * API endpoint to fetch live wind data from Windguru stations.
 *
 * Windguru JSON API returns real-time wind measurements from weather stations.
 * Data includes wind speed, wind direction, gusts, and timestamp.
 *
 * @param {Request} request
 * @param {Object} params - { stationId: string } - Windguru station ID (e.g., "2329")
 * @returns {Object} Live wind data or error
 */
export async function GET(request, { params }) {
  try {
    // Await params (Next.js 15+ requirement)
    const resolvedParams = await params;
    const stationId = resolvedParams?.stationId;

    if (!stationId) {
      return NextResponse.json(
        { error: "Station ID is required" },
        { status: 400 }
      );
    }

    // Fetch live data from Windguru JSON API
    // API returns last measurement from the station
    const windguruUrl = `https://stations.windguru.cz/getdata_v2.php?id_station=${stationId}&avg_minutes=10&last_hour_count=1`;

    const response = await fetch(windguruUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Windguru API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract latest measurement
    // Windguru API returns arrays of measurements
    // We want the most recent one
    if (!data || !data[stationId]) {
      return NextResponse.json(
        { error: "No data available for station" },
        { status: 404 }
      );
    }

    const stationData = data[stationId];

    // Get the latest measurement index
    const measurements = stationData.dt_utc || [];
    if (measurements.length === 0) {
      return NextResponse.json(
        { error: "No recent measurements" },
        { status: 404 }
      );
    }

    const latestIndex = measurements.length - 1;

    // Extract wind data from the latest measurement
    const liveWind = {
      stationId: stationId,
      timestamp: measurements[latestIndex] * 1000, // Convert to milliseconds
      windSpeed: stationData.wind_avg?.[latestIndex] || null, // Average wind speed in m/s
      windGust: stationData.wind_max?.[latestIndex] || null, // Max gust in m/s
      windDirection: stationData.wind_direction?.[latestIndex] || null, // Direction in degrees
      temperature: stationData.temperature?.[latestIndex] || null, // Temperature in Celsius
      updatedAt: Date.now(),
    };

    // Convert m/s to knots (1 m/s = 1.94384 knots)
    if (liveWind.windSpeed !== null) {
      liveWind.windSpeedKnots = Math.round(liveWind.windSpeed * 1.94384 * 10) / 10;
    }
    if (liveWind.windGust !== null) {
      liveWind.windGustKnots = Math.round(liveWind.windGust * 1.94384 * 10) / 10;
    }

    return NextResponse.json(liveWind, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60", // Cache for 1 minute
      },
    });
  } catch (error) {
    console.error("Error fetching live wind data:", error);
    return NextResponse.json(
      { error: "Failed to fetch live wind data", details: error.message },
      { status: 500 }
    );
  }
}
