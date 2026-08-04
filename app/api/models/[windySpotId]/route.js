import { NextResponse } from "next/server";
import { DEFAULT_MODEL, getModelForecasts } from "../../../../lib/scraper";

/**
 * Per-model wind forecasts for one spot, live.
 *
 * The confidence grid needs the models' CURRENT calls, not their history — so
 * it does not actually need the Convex ingest, which exists to persist a series
 * over time for skill scoring later. Serving it straight from the upstream
 * removes the deploy dependency entirely and means the grid works the moment
 * the page loads.
 *
 * Follows the existing proxy pattern in /api/live-wind/[stationId]: the browser
 * cannot call windy.app directly (no CORS), and putting the model allowlist and
 * the dedup guards on the server keeps them in one place.
 *
 * Cached in-process for 30 minutes. Upstream models refresh every few hours,
 * so a page view does not need to be five fresh round-trips, and this keeps our
 * request volume against an undocumented endpoint modest.
 *
 * The cache is a module-level map rather than `export const revalidate`, which
 * this app cannot use: nextConfig.cacheComponents rejects the route segment
 * config outright. (Commit f5d8ded removed `export const dynamic` for the same
 * reason.)
 */
const TTL_MS = 30 * 60 * 1000;
const cache = new Map();

export async function GET(request, { params }) {
  const { windySpotId } = await params;

  if (!windySpotId || !/^\d+$/.test(windySpotId)) {
    // The id is interpolated into an upstream URL; constrain it rather than
    // trusting the path segment.
    return NextResponse.json({ error: "Invalid spot id" }, { status: 400 });
  }

  const hit = cache.get(windySpotId);
  if (hit && Date.now() - hit.fetchedAt < TTL_MS) {
    return NextResponse.json(hit, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
  }

  try {
    const models = await getModelForecasts(windySpotId);
    const payload = {
      windySpotId,
      fetchedAt: Date.now(),
      // The widget's default series is what the scraper stores and what every
      // score is computed from. Naming it lets the grid say so instead of
      // implying our forecast is independent of the models it is judging.
      sourceModel: DEFAULT_MODEL,
      models: models.map(({ model, slots }) => ({ model, slots })),
    };
    // Only cache a useful answer; an empty result should be retried, not
    // pinned for half an hour.
    if (models.length > 0) cache.set(windySpotId, payload);

    return NextResponse.json(
      payload,
      {
        headers: {
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
        },
      }
    );
  } catch (error) {
    // A failure here must degrade to "no model data", never to an error state
    // on the page — the rest of the confidence screen stands without it.
    console.error(`Model fetch failed for ${windySpotId}:`, error.message);
    return NextResponse.json(
      { windySpotId, models: [], error: "upstream unavailable" },
      { status: 200 }
    );
  }
}
