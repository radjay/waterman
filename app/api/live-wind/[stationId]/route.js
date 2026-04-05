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

    // Try multiple Windguru API endpoints
    // First try the v2 API
    let windguruUrl = `https://www.windguru.cz/int/iapi.php?q=station_data_current&id_station=${stationId}`;

    let response = await fetch(windguruUrl, {
      cache: "no-store", // Always fetch fresh — never serve a cached wind reading
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "application/json, */*",
        Referer: `https://www.windguru.cz/station/${stationId}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Windguru API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract latest measurement from Windguru response
    // The API returns current station data
    if (!data) {
      return NextResponse.json(
        { error: "No data available for station" },
        { status: 404 }
      );
    }

    // Windguru iAPI returns data in this format:
    // { wind_avg: number, wind_max: number, wind_direction: number, etc. }
    // NOTE: Data is already in KNOTS, not m/s!
    // NOTE: When windstill, Windguru omits wind_avg/wind_max entirely (no field at all).
    //       Treat absent wind fields as 0 — the station is alive but reporting calm conditions.
    const windSpeed = data.wind_avg ?? 0;
    const windGust = data.wind_max ?? 0;

    const liveWind = {
      stationId: stationId,
      timestamp: data.unixtime ? data.unixtime * 1000 : Date.now(), // unixtime is the correct field name
      windSpeed,
      windGust,
      windSpeedKnots: Math.round(windSpeed * 10) / 10,
      windGustKnots: Math.round(windGust * 10) / 10,
      windDirection: data.wind_direction ?? null, // Direction in degrees (null when calm is valid)
      temperature: data.temperature ?? null, // Temperature in Celsius
      updatedAt: Date.now(),
    };

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
