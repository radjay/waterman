/**
 * Scraper for Windy.app forecast data
 * Uses the direct API endpoint instead of Puppeteer for better reliability
 */

/**
 * Extract spot ID from a Windy.app URL
 * @param {string} spotUrl - URL like "https://windy.app/forecast2/spot/8512151/Marina+de+Cascais"
 * @returns {string|null} - Spot ID or null if not found
 */
export function extractSpotId(spotUrl) {
    const match = spotUrl.match(/\/spot\/(\d+)/);
    return match ? match[1] : null;
}

/**
 * The wind models worth requesting. Verified 2026-08-04 against spot 8512151:
 * these five return genuinely distinct series.
 *
 * Excluded on purpose:
 *   gdps, cfs  - echo back model:"gfs27_long"; caught by the echo check
 *   arome      - echoes "arome" but returns a series identical to GFS. The echo
 *                check does NOT catch this; only content dedup does. Without
 *                that, it becomes a phantom fifth opinion inflating every
 *                agreement count.
 *   gfs27      - echoes correctly but duplicates gfs27_long over our range
 *   uvi, silam, gfs_wave, cmems - UV, air quality and wave models, not wind
 */
/**
 * The model the widget serves when no `model` parameter is given — which is
 * what the scraper stores in forecast_slots, and therefore what every
 * condition score is computed from.
 */
export const DEFAULT_MODEL = "gfs27_long";

export const WIND_MODEL_ALLOWLIST = [
  "ecmwf",
  "gfs27_long",
  "iconeuro",
  "iconglobal",
  "lew",
];

const WIDGET_URL = (spotId, model) =>
  `https://windy.app/widget/data.php?id=wfwindyapp&spotID=${spotId}&timelineRange=future` +
  (model ? `&model=${encodeURIComponent(model)}` : "");

const WIDGET_HEADERS = (spotId) => ({
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "*/*",
  Referer: `https://windy.app/forecast2/spot/${spotId}`,
});

/** Pull the `window.wfwindyapp = {...}` payload out of the widget response. */
export function parseWidgetPayload(text) {
  const match = text.match(/window\.wfwindyapp\s*=\s*({[\s\S]+?})(?:;|$)/);
  if (!match) throw new Error("Could not extract JSON from API response");
  return JSON.parse(match[1]);
}

/**
 * A cheap content signature for a model's wind series, used to spot a model
 * that echoes its own name but hands back another model's numbers.
 */
export function seriesSignature(rows) {
  return (rows || [])
    .slice(0, 24)
    .map((r) => `${r.timestamp}:${r.windSpeed}:${r.windDirection}`)
    .join("|");
}

/**
 * Normalise raw widget rows into our slot shape. Wind arrives in m/s.
 */
function toSlots(rows, { includePast = false } = {}) {
  const now = Date.now();
  const slots = [];
  for (const row of rows || []) {
    const timestamp = row.timestamp * 1000;
    if (!includePast && timestamp < now) continue;
    slots.push({
      timestamp,
      speed: Math.round((row.windSpeed ?? 0) * 1.94384 * 10) / 10,
      gust: Math.round((row.windGust ?? 0) * 1.94384 * 10) / 10,
      direction: row.windDirection || 0,
    });
  }
  return slots;
}

/**
 * Which models this spot actually offers, intersected with the allowlist.
 * @returns {Promise<string[]>}
 */
export async function getAvailableModels(spotId) {
  const response = await fetch(WIDGET_URL(spotId), { headers: WIDGET_HEADERS(spotId) });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  const data = parseWidgetPayload(await response.text());
  const available = Array.isArray(data.available_models) ? data.available_models : [];
  return WIND_MODEL_ALLOWLIST.filter((m) => available.includes(m));
}

/**
 * Fetch one model's wind series.
 *
 * @returns {Promise<{model:string, slots:Array, signature:string}|null>}
 *   null when the response cannot be trusted as that model's own data.
 */
export async function getForecastForModel(spotId, model) {
  const response = await fetch(WIDGET_URL(spotId, model), { headers: WIDGET_HEADERS(spotId) });
  if (!response.ok) throw new Error(`API request failed for ${model}: ${response.status}`);

  const data = parseWidgetPayload(await response.text());

  // Guard 1: the endpoint silently substitutes a fallback model for some
  // requests (gdps, cfs) and tells us by echoing a different name.
  if (data.model && data.model !== model) {
    console.log(`  ${model}: endpoint substituted "${data.model}" — discarding`);
    return null;
  }

  const rows = JSON.parse(data.data);
  return { model, slots: toSlots(rows), signature: seriesSignature(rows) };
}

/**
 * Every trustworthy per-model wind series for a spot.
 *
 * Guard 2 lives here: a model whose series is byte-identical to one already
 * accepted is dropped, whatever it called itself. `arome` echoes its own name
 * and returns GFS data, so the echo check alone is not enough.
 *
 * @returns {Promise<Array<{model:string, slots:Array}>>}
 */
export async function getModelForecasts(spotId, models) {
  const wanted = models ?? (await getAvailableModels(spotId));

  const settled = await Promise.allSettled(
    wanted.map((model) => getForecastForModel(spotId, model))
  );

  const accepted = [];
  const seen = new Map();

  for (const [i, result] of settled.entries()) {
    const model = wanted[i];
    if (result.status === "rejected") {
      console.log(`  ${model}: fetch failed — ${result.reason?.message}`);
      continue;
    }
    const value = result.value;
    if (!value || !value.slots.length) continue;

    const duplicateOf = seen.get(value.signature);
    if (duplicateOf) {
      console.log(`  ${model}: identical series to "${duplicateOf}" — discarding`);
      continue;
    }

    seen.set(value.signature, model);
    accepted.push({ model: value.model, slots: value.slots });
  }

  return accepted;
}

/**
 * Fetch forecast data from Windy API
 * @param {string} spotUrlOrId - Windy.app spot URL or spot ID (e.g., "8512151")
 * @returns {Promise<Array>} - Array of forecast slots
 */
export async function getForecast(spotUrlOrId) {
    console.log(`Starting scraper for ${spotUrlOrId}...`);

    try {
        // Extract spot ID - either it's already an ID or we extract from URL
        let spotId;
        if (/^\d+$/.test(spotUrlOrId)) {
            // It's already a spot ID
            spotId = spotUrlOrId;
        } else {
            // Extract from URL
            spotId = extractSpotId(spotUrlOrId);
            if (!spotId) {
                throw new Error(`Could not extract spot ID from URL: ${spotUrlOrId}`);
            }
        }

        console.log(`Using spot ID: ${spotId}`);

        // Fetch data from Windy API
        const apiUrl = `https://windy.app/widget/data.php?id=wfwindyapp&spotID=${spotId}&timelineRange=future`;
        console.log(`Fetching from API: ${apiUrl}`);

        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Referer': `https://windy.app/forecast2/spot/${spotId}`,
            },
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const text = await response.text();
        console.log(`Received ${text.length} bytes from API`);

        // Extract JSON from the response (wrapped in window.wfwindyapp = {...})
        const jsonMatch = text.match(/window\.wfwindyapp\s*=\s*({[\s\S]+?})(?:;|$)/);
        if (!jsonMatch) {
            throw new Error('Could not extract JSON from API response');
        }

        const data = JSON.parse(jsonMatch[1]);
        console.log(`Parsed API response, keys: ${Object.keys(data).join(', ')}`);

        // Parse forecast data (it's a JSON string)
        const forecastData = JSON.parse(data.data);
        console.log(`Found ${forecastData.length} forecast slots`);

        // Parse granular tide data - we'll extract high/low tides from this
        // Check the structure of the tide data to see if it has type markers
        let tideData = [];
        if (data.tides) {
            tideData = JSON.parse(data.tides);
            console.log(`Found ${tideData.length} tide entries`);
            if (tideData.length > 0) {
                console.log(`Sample tide entry:`, JSON.stringify(tideData[0]));
            }
        }

        // Transform API data to our format
        const suitableSlots = [];
        const now = Date.now();

        for (const slot of forecastData) {
            // Convert timestamp from seconds to milliseconds
            const timestamp = slot.timestamp * 1000;

            // Skip past data
            if (timestamp < now) {
                continue;
            }

            // Note: Daylight filtering now happens at query/display time
            // Store all slots to database for complete historical data

            // Convert wind speed from m/s to knots
            const speedKnots = (slot.windSpeed ?? 0) * 1.94384;
            const gustKnots = (slot.windGust ?? 0) * 1.94384;

            suitableSlots.push({
                timestamp: timestamp,
                speed: Math.round(speedKnots * 10) / 10,
                gust: Math.round(gustKnots * 10) / 10,
                direction: slot.windDirection || 0,
                // Wave data
                waveHeight: slot.wavesHeight || 0,
                wavePeriod: slot.wavesPeriod || 0,
                waveDirection: slot.wavesDirection || 0,
            });
        }

        // Process tide data - find high/low tides by detecting direction changes
        // Use a small window to smooth out noise before detecting peaks/troughs.
        //
        // Keep marks from earlier today (and the previous evening), not only
        // the future. saveTides replaces the spot's whole tide table on each
        // scrape; filtering to `>= now` wiped this morning's high/low and left
        // the day chart drawing a tide line that only started mid-afternoon.
        const tideEvents = [];
        if (tideData && tideData.length > 2) {
            const now = Date.now();
            const tideKeepFrom = now - 18 * 60 * 60 * 1000;
            const sortedTides = tideData
                .map(t => ({
                    time: t.timestamp * 1000,
                    height: t.tideHeight,
                }))
                .filter(t => t.time >= tideKeepFrom)
                .sort((a, b) => a.time - b.time);
            
            if (sortedTides.length >= 5) {
                const WINDOW = 3; // Look 3 points before and after for smoothing
                
                // Find direction changes: use a small window to smooth out noise
                for (let i = WINDOW; i < sortedTides.length - WINDOW; i++) {
                    const current = sortedTides[i];
                    
                    // Get average heights before and after to determine trend
                    const beforePoints = sortedTides.slice(i - WINDOW, i);
                    const afterPoints = sortedTides.slice(i + 1, i + WINDOW + 1);
                    
                    const avgBefore = beforePoints.reduce((sum, p) => sum + p.height, 0) / beforePoints.length;
                    const avgAfter = afterPoints.reduce((sum, p) => sum + p.height, 0) / afterPoints.length;
                    
                    // Peak: was rising (current > avg before), will fall (avg after < current)
                    const isPeak = current.height > avgBefore && avgAfter < current.height;
                    
                    // Trough: was falling (current < avg before), will rise (avg after > current)
                    const isTrough = current.height < avgBefore && avgAfter > current.height;
                    
                    if (isPeak) {
                        tideEvents.push({
                            time: current.time,
                            type: 'high',
                            height: current.height,
                        });
                    } else if (isTrough) {
                        tideEvents.push({
                            time: current.time,
                            type: 'low',
                            height: current.height,
                        });
                    }
                }
                
                // Deduplicate: keep only the highest peak and lowest trough within each time window
                // Tides typically occur ~6 hours apart, so use 3-hour windows
                const MIN_TIME_BETWEEN_EVENTS = 3 * 60 * 60 * 1000; // 3 hours
                const filteredEvents = [];
                
                tideEvents.sort((a, b) => a.time - b.time);
                
                let currentGroup = null;
                for (const event of tideEvents) {
                    if (!currentGroup || 
                        currentGroup.type !== event.type || 
                        event.time - currentGroup.best.time > MIN_TIME_BETWEEN_EVENTS) {
                        // Start a new group
                        if (currentGroup) {
                            filteredEvents.push(currentGroup.best);
                        }
                        currentGroup = {
                            type: event.type,
                            best: event,
                        };
                    } else {
                        // Same type within time window - keep the best one
                        if (event.type === 'high') {
                            if (event.height > currentGroup.best.height) {
                                currentGroup.best = event;
                            }
                        } else {
                            if (event.height < currentGroup.best.height) {
                                currentGroup.best = event;
                            }
                        }
                    }
                }
                if (currentGroup) {
                    filteredEvents.push(currentGroup.best);
                }
                
                // Replace with filtered results
                tideEvents.length = 0;
                tideEvents.push(...filteredEvents);
            }
        }

        console.log(`Processed ${suitableSlots.length} slots (all slots stored, daylight filtering at display time)`);
        console.log(`Found ${tideEvents.length} actual high/low tide events (peaks and troughs)`);
        
        return {
            slots: suitableSlots,
            tides: tideEvents,
        };

    } catch (error) {
        console.error("Error in getForecast:", error);
        throw error; // Re-throw so caller can handle it
    }
}
