import { NextResponse } from "next/server";
import {
  fetchCurrentStationPayload,
  parseCurrentReading,
} from "../../../../lib/windguru";

/**
 * Live wind for overlays (cam, next strip).
 *
 * Uses the same Windguru parse path as the station cron — the old hand-rolled
 * mapping treated Windguru's garbage sentinels (e.g. wind_avg: -534.6,
 * wind_direction: -990 on a flaky Cabo Raso poll) as real knots and painted
 * "-535" on the cam. parseCurrentReading rejects those.
 */
export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const stationId = resolvedParams?.stationId;

    if (!stationId) {
      return NextResponse.json(
        { error: "Station ID is required" },
        { status: 400 }
      );
    }

    const payload = await fetchCurrentStationPayload(stationId);
    const reading = parseCurrentReading(payload);

    if (!reading) {
      // Dead station, calm-without-unixtime, or junk values — caller falls back
      // to a plain LIVE chip rather than a fabricated number.
      return NextResponse.json(
        { error: "No usable reading for station" },
        { status: 404 }
      );
    }

    // Direction outside 0–360 is the same class of sentinel as negative speed.
    const direction =
      Number.isFinite(reading.direction) &&
      reading.direction >= 0 &&
      reading.direction <= 360
        ? reading.direction
        : null;

    const liveWind = {
      stationId,
      timestamp: reading.time,
      windSpeed: reading.speed,
      windGust: reading.gust ?? null,
      windSpeedKnots: reading.speed,
      windGustKnots: reading.gust ?? null,
      windDirection: direction,
      temperature: reading.tempC ?? null,
      updatedAt: Date.now(),
    };

    return NextResponse.json(liveWind, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60",
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
