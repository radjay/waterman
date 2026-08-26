/** Stagger so one 10-minute action never scrapes every spot. */
export const SPOT_STAGGER_MS = 20_000;

export function isForecastLive(spot) {
  return Boolean(spot) && !spot.webcamOnly && spot.enabled !== false;
}

export function scrapeableSpots(spots) {
  return (spots || []).filter(isForecastLive);
}

export function mapDbSlots(slots) {
  return (slots || []).map((s) => ({
    timestamp: s.timestamp,
    speed: s.speed,
    gust: s.gust,
    direction: s.direction,
    waveHeight: s.waveHeight,
    wavePeriod: s.wavePeriod,
    waveDirection: s.waveDirection,
  }));
}

/**
 * Scrape one spot: Windy forecast, tides, then per-model series.
 * Windy failure records an empty scrape and does not throw.
 */
export async function scrapeOneSpot({
  spot,
  now = Date.now(),
  getForecast,
  getModelForecasts,
  extractSpotId,
  saveForecastSlots,
  saveTides,
  saveModelSlots,
  updateWindySpotId,
}) {
  const windySpotId = spot.windySpotId || extractSpotId(spot.url);
  if (!windySpotId) {
    await saveForecastSlots({
      spotId: spot._id,
      scrapeTimestamp: now,
      slots: [],
    });
    return { ok: false, error: "Could not determine Windy Spot ID", spotName: spot.name };
  }

  if (!spot.windySpotId && updateWindySpotId) {
    try {
      await updateWindySpotId({ spotId: spot._id, windySpotId });
    } catch {
      // Non-blocking — scrape can still use the extracted id.
    }
  }

  let forecast;
  try {
    forecast = await getForecast(windySpotId);
  } catch (error) {
    await saveForecastSlots({
      spotId: spot._id,
      scrapeTimestamp: now,
      slots: [],
    });
    return {
      ok: false,
      error: error.message || "Windy fetch failed",
      spotName: spot.name,
    };
  }

  const slots = mapDbSlots(forecast.slots || forecast);
  const tides = forecast.tides || [];
  const saveResult = await saveForecastSlots({
    spotId: spot._id,
    scrapeTimestamp: now,
    slots,
  });

  let modelsSaved = 0;
  if (slots.length > 0 && getModelForecasts && saveModelSlots) {
    try {
      const modelForecasts = await getModelForecasts(windySpotId);
      if (modelForecasts.length > 0) {
        const result = await saveModelSlots({
          spotId: spot._id,
          scrapeTimestamp: now,
          models: modelForecasts,
        });
        modelsSaved = result?.inserted ?? 0;
      }
    } catch (error) {
      console.error(`Model ingest failed for ${spot.name}: ${error.message}`);
    }
  }

  if (tides.length > 0 && saveTides) {
    await saveTides({
      spotId: spot._id,
      scrapeTimestamp: now,
      tides,
    });
  }

  return {
    ok: Boolean(saveResult?.isSuccessful),
    spotName: spot.name,
    slotsCount: slots.length,
    tidesCount: tides.length,
    modelsSaved,
  };
}
