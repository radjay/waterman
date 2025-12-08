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

        // Parse tide data if available
        let tideData = [];
        if (data.tides) {
            tideData = JSON.parse(data.tides);
            console.log(`Found ${tideData.length} tide entries`);
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

            // Check if it's daylight hours (9 AM - 6 PM)
            const date = new Date(timestamp);
            const hour = date.getHours();
            const isDaylight = hour >= 9 && hour <= 18;

            if (!isDaylight) {
                continue;
            }

            // Convert wind speed from m/s to knots
            const speedKnots = (slot.windSpeed || 0) * 1.94384;
            const gustKnots = (slot.windGust || 0) * 1.94384;

            // Find corresponding tide data (closest timestamp)
            let tideHeight = null;
            let tideType = null;
            let tideTime = null;

            if (tideData.length > 0) {
                // Find the closest tide entry
                let closestTide = null;
                let minDiff = Infinity;

                for (const tide of tideData) {
                    const tideTimestamp = tide.timestamp * 1000;
                    const diff = Math.abs(tideTimestamp - timestamp);
                    if (diff < minDiff && diff < 3 * 60 * 60 * 1000) { // Within 3 hours
                        minDiff = diff;
                        closestTide = tide;
                    }
                }

                if (closestTide) {
                    tideHeight = closestTide.tideHeight;
                    tideTime = closestTide.timestamp * 1000;
                    // Determine if high or low tide (simplified: positive = high, negative = low)
                    // You might want to improve this logic based on actual tide data structure
                    tideType = closestTide.tideHeight > 0 ? 'high' : 'low';
                }
            }

            suitableSlots.push({
                timestamp: timestamp,
                speed: Math.round(speedKnots * 10) / 10,
                gust: Math.round(gustKnots * 10) / 10,
                direction: slot.windDirection || 0,
                // Wave data
                waveHeight: slot.wavesHeight || 0,
                wavePeriod: slot.wavesPeriod || 0,
                waveDirection: slot.wavesDirection || 0,
                // Tide data
                tideHeight: tideHeight,
                tideType: tideType,
                tideTime: tideTime,
            });
        }

        console.log(`Processed ${suitableSlots.length} suitable slots (daylight hours only)`);
        return suitableSlots;

    } catch (error) {
        console.error("Error in getForecast:", error);
        throw error; // Re-throw so caller can handle it
    }
}
