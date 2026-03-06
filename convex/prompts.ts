/**
 * Prompt building utilities for LLM scoring.
 */

/**
 * System prompts for each sport (general evaluation guidelines).
 * These can be customized per spot in the database.
 */
const GUST_FACTOR_GUIDE = `
GUST FACTOR: Data shows gust as "+Xkt" (absolute swing) and "Y%" (ratio to base wind).
- Under 120% / +3kt: Rock-steady wind. Do NOT call this gusty or jittery.
- 120-140% / +5-8kt: Mildly gusty but manageable for most riders.
- 140-160% / +10-15kt: Noticeably gusty, requires experience to handle.
- Over 160% / +15kt+: Dangerously gusty, unpredictable power surges.
Use BOTH numbers to judge. A +3kt swing is nothing regardless of base speed.
`;

const WRITING_STYLE = `
WRITING STYLE:
Write like you're texting a friend who asked "should I go?". Be honest, opinionated, and specific.
- Talk about what the session will actually FEEL like — not just numbers
- Use vivid, concrete language: "buttery smooth" not "consistent", "nuking" not "very strong"
- Be blunt about bad days: "save your energy" or "you'll be fighting chop the whole time"
- Get excited about great days: "drop everything and go" or "this is what you live for"
- Mention the best window if conditions shift during the day
- When one factor is a DEALBREAKER (waves too big, no wind, after dark), keep the reasoning to ONE short sentence. Do NOT discuss wind quality, direction, or other factors — they are irrelevant if you can't ride.
- Good/great conditions: 2-3 sentences with detail. Bad conditions with a dealbreaker: 1 sentence max.
- IMPORTANT: Always respond in the required JSON format regardless of condition quality. Never output plain text.
`;

export const SYSTEM_SPORT_PROMPTS = {
    wingfoil: `You are an expert wingfoiler evaluating conditions. Consider:
- Wind speed: 15-25 knots is ideal, but steady wind beats strong gusts
- Gust factor: Clean, consistent wind is much better than gusty conditions
- Wind direction: Cross-onshore or side-shore is ideal for most spots
- Overall: Safety, ride quality, and session enjoyment
${GUST_FACTOR_GUIDE}
Score 0-100:
- 90-100: Excellent conditions, rare day
- 75-89: Very good conditions, well worth it
- 60-74: Decent conditions, enjoyable session
- 40-59: Mediocre, rideable but nothing special
- 0-39: Poor conditions, best to skip
${WRITING_STYLE}`,

    kitesurfing: `You are an expert kitesurfer evaluating conditions. Consider:
- Wind speed: 12-25 knots is ideal range, with steady wind being crucial
- Gust factor: Clean, consistent wind is much better than gusty conditions
- Wind direction: Cross-onshore or side-shore is ideal for most spots
- Wave conditions: Flat to moderate waves (0.5-2m) are ideal for most riders
- Overall: Safety, ride quality, and session enjoyment
${GUST_FACTOR_GUIDE}
Score 0-100:
- 90-100: Excellent conditions, rare day
- 75-89: Very good conditions, well worth it
- 60-74: Decent conditions, enjoyable session
- 40-59: Mediocre, rideable but nothing special
- 0-39: Poor conditions, best to skip
${WRITING_STYLE}`,

    surfing: `You are an experienced surfer evaluating conditions. Consider:
- Wave height: Right size for the spot - not too small, not too big
- Wave period: Longer periods (12+ sec) mean cleaner, more powerful waves
- Wave direction: Offshore or light onshore keeps things clean
- Tide: Depends on the spot - some work on low, others need high
- Wind: Offshore or calm wind keeps the face clean; onshore wind makes it messy
- Overall: Wave quality, consistency, and session enjoyment
${GUST_FACTOR_GUIDE}
Score 0-100:
- 90-100: Excellent conditions, rare day
- 75-89: Very good waves, well worth it
- 60-74: Decent conditions, enjoyable session
- 40-59: Mediocre, waves are there but nothing special
- 0-39: Flat or messy, best to skip
${WRITING_STYLE}`,
};

/**
 * Default temporal prompt (can be customized per spot in database).
 */
export const DEFAULT_TEMPORAL_PROMPT = `Consider trends in conditions 24 hours before and after the current time slot.
- Improving conditions (getting better) should score higher
- Deteriorating conditions (getting worse) should score lower
- Consistent conditions indicate stability and reliability
- Rapid changes may indicate unstable weather patterns`;

/**
 * Convert degrees to cardinal direction (16-point compass).
 * Wind direction is stored as "from" direction (meteorological convention).
 */
function getCardinalDirection(degrees: number): string {
    const directions = [
        "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
    ];
    // Normalize degrees to 0-360 range
    const normalizedDegrees = ((degrees % 360) + 360) % 360;
    const index = Math.round(normalizedDegrees / 22.5) % 16;
    return directions[index];
}

/**
 * Get display wind direction from stored wind direction.
 * Wind direction is stored as "from" direction, but displayed as "to" direction (180° opposite).
 * This ensures the LLM prompt matches what users see in the UI.
 */
function getDisplayWindDirection(degrees: number): string {
    return getCardinalDirection(degrees + 180);
}

/**
 * Format a slot's condition data for the prompt.
 */
export function formatSlotData(slot: any): string {
    const date = new Date(slot.timestamp);
    const dateStr = date.toISOString().replace('T', ' ').substring(0, 16);
    
    const windCardinal = getDisplayWindDirection(slot.direction);
    const gustDiff = Math.round((slot.gust - slot.speed) * 10) / 10;
    const gustRatio = slot.speed > 0 ? Math.round((slot.gust / slot.speed) * 100) : 0;
    let data = `${dateStr} - Wind: ${slot.speed} knots ${windCardinal} (${slot.direction}°), Gust: ${slot.gust} knots (+${gustDiff}kt, ${gustRatio}%)`;
    
    if (slot.waveHeight !== undefined) {
        data += `, Waves: ${slot.waveHeight}m`;
    }
    if (slot.wavePeriod !== undefined) {
        data += `, Period: ${slot.wavePeriod}s`;
    }
    if (slot.waveDirection !== undefined) {
        const waveCardinal = getCardinalDirection(slot.waveDirection);
        data += `, Wave Dir: ${waveCardinal} (${slot.waveDirection}°)`;
    }
    if (slot.tideType) {
        data += `, Tide: ${slot.tideType}`;
    }
    if (slot.tideHeight !== undefined) {
        data += ` (${slot.tideHeight}m)`;
    }
    
    return data;
}

/**
 * Build the full prompt for LLM scoring.
 * 
 * @param systemPrompt - Sport evaluation guidelines
 * @param spotPrompt - Spot-specific characteristics
 * @param temporalPrompt - Temporal context instructions
 * @param currentSlot - The slot being scored
 * @param timeSeriesContext - Array of slots from 24h before to 24h after
 * @param spotName - Name of the spot
 * @param sunTimes - Optional sunrise/sunset times for contextual slots
 * @param isContextual - Whether this is a contextual slot (before sunrise or after sunset)
 * @returns Object with system and user prompt strings
 */
export function buildPrompt(
    systemPrompt: string,
    spotPrompt: string,
    temporalPrompt: string,
    currentSlot: any,
    timeSeriesContext: any[],
    spotName: string,
    sunTimes?: { sunrise: Date; sunset: Date },
    isContextual?: boolean
): { system: string; user: string } {
    // Add sunrise/sunset info to prompt for contextual slots
    let contextualNote = "";
    if (isContextual && sunTimes) {
        const slotTime = new Date(currentSlot.timestamp);
        const sunriseStr = sunTimes.sunrise.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const sunsetStr = sunTimes.sunset.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        if (slotTime < sunTimes.sunrise) {
            contextualNote = `\n\nIMPORTANT: This time slot is BEFORE sunrise (${sunriseStr}). Conditions are in darkness and not suitable for watersports. Lower the score accordingly. This is shown for temporal context only.`;
        } else if (slotTime > sunTimes.sunset) {
            contextualNote = `\n\nIMPORTANT: This time slot is AFTER sunset (${sunsetStr}). Conditions are in darkness and not suitable for watersports. Lower the score accordingly. This is shown for temporal context only.`;
        }
    }
    
    // Combine all prompts into system prompt
    const fullSystemPrompt = `${systemPrompt}\n\nSpot: ${spotName}\n${spotPrompt}\n\n${temporalPrompt}${contextualNote}`;

    // Build user prompt with current slot and time series
    let userPrompt = `Evaluate these conditions:\n\nCurrent: ${formatSlotData(currentSlot)}\n\n`;

    // Add time series context
    if (timeSeriesContext.length > 0) {
        const beforeSlots = timeSeriesContext.filter(s => s.timestamp < currentSlot.timestamp);
        const afterSlots = timeSeriesContext.filter(s => s.timestamp > currentSlot.timestamp);

        if (beforeSlots.length > 0) {
            userPrompt += "Historical context (24h before):\n";
            const keyTimesBefore = [
                currentSlot.timestamp - 24 * 60 * 60 * 1000,
                currentSlot.timestamp - 12 * 60 * 60 * 1000,
            ];

            for (const keyTime of keyTimesBefore) {
                const closest = beforeSlots.reduce((prev, curr) =>
                    Math.abs(curr.timestamp - keyTime) < Math.abs(prev.timestamp - keyTime) ? curr : prev
                );
                if (closest && Math.abs(closest.timestamp - keyTime) < 2 * 60 * 60 * 1000) {
                    const hoursAgo = Math.round((currentSlot.timestamp - closest.timestamp) / (60 * 60 * 1000));
                    userPrompt += `${hoursAgo}h ago: ${formatSlotData(closest)}\n`;
                }
            }
            userPrompt += "\n";
        }

        if (afterSlots.length > 0) {
            userPrompt += "Future context (24h after):\n";
            const keyTimesAfter = [
                currentSlot.timestamp + 12 * 60 * 60 * 1000,
                currentSlot.timestamp + 24 * 60 * 60 * 1000,
            ];

            for (const keyTime of keyTimesAfter) {
                const closest = afterSlots.reduce((prev, curr) =>
                    Math.abs(curr.timestamp - keyTime) < Math.abs(prev.timestamp - keyTime) ? curr : prev
                );
                if (closest && Math.abs(closest.timestamp - keyTime) < 2 * 60 * 60 * 1000) {
                    const hoursAhead = Math.round((closest.timestamp - currentSlot.timestamp) / (60 * 60 * 1000));
                    userPrompt += `${hoursAhead}h ahead: ${formatSlotData(closest)}\n`;
                }
            }
        }
    }

    userPrompt += "\nRespond with ONLY a JSON object (no markdown, no explanation outside JSON):\n";
    userPrompt += '{"score": <integer 0-100>, "reasoning": "<2-3 sentences, max 500 chars>", "factors": {"windQuality": <int 0-100>, "waveQuality": <int 0-100>, "tideQuality": <int 0-100>, "overallConditions": <int 0-100>}}\n';
    userPrompt += "All values in factors MUST be numbers, not strings.";

    return {
        system: fullSystemPrompt,
        user: userPrompt,
    };
}

/**
 * Build a batch prompt that scores all slots for a single day in one LLM call.
 *
 * @param systemPrompt - Sport evaluation guidelines
 * @param spotPrompt - Spot-specific characteristics
 * @param temporalPrompt - Temporal context instructions
 * @param slots - All daylight/contextual slots for the day, sorted by timestamp
 * @param timeSeriesContext - Surrounding context slots (24h before first slot, 24h after last slot)
 * @param spotName - Name of the spot
 * @param contextualSlotTimestamps - Set of timestamps that are contextual (before sunrise / after sunset)
 * @param sunTimes - Optional sunrise/sunset for the day
 * @returns Object with system and user prompt strings
 */
export function buildBatchPrompt(
    systemPrompt: string,
    spotPrompt: string,
    temporalPrompt: string,
    slots: any[],
    timeSeriesContext: any[],
    spotName: string,
    contextualSlotTimestamps?: Set<number>,
    sunTimes?: { sunrise: Date; sunset: Date },
): { system: string; user: string } {
    let contextualNote = "";
    if (sunTimes) {
        const sunriseStr = sunTimes.sunrise.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const sunsetStr = sunTimes.sunset.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        contextualNote = `\nSunrise: ${sunriseStr}, Sunset: ${sunsetStr}. Slots outside daylight hours should score lower as they are not suitable for watersports.`;
    }

    const fullSystemPrompt = `${systemPrompt}\n\nSpot: ${spotName}\n${spotPrompt}\n\n${temporalPrompt}${contextualNote}`;

    // Build user prompt with all slots for the day
    const firstSlot = slots[0];
    const lastSlot = slots[slots.length - 1];

    let userPrompt = `Score each of the following ${slots.length} time slots for this day.\n\n`;

    // Add 24h context before the day
    const beforeContext = timeSeriesContext.filter(s => s.timestamp < firstSlot.timestamp);
    const afterContext = timeSeriesContext.filter(s => s.timestamp > lastSlot.timestamp);

    if (beforeContext.length > 0) {
        userPrompt += "Context (preceding 24h):\n";
        const keyTimesBefore = [
            firstSlot.timestamp - 24 * 60 * 60 * 1000,
            firstSlot.timestamp - 12 * 60 * 60 * 1000,
            firstSlot.timestamp - 6 * 60 * 60 * 1000,
        ];
        for (const keyTime of keyTimesBefore) {
            const closest = beforeContext.reduce((prev, curr) =>
                Math.abs(curr.timestamp - keyTime) < Math.abs(prev.timestamp - keyTime) ? curr : prev
            );
            if (closest && Math.abs(closest.timestamp - keyTime) < 2 * 60 * 60 * 1000) {
                const hoursAgo = Math.round((firstSlot.timestamp - closest.timestamp) / (60 * 60 * 1000));
                userPrompt += `  ${hoursAgo}h before first slot: ${formatSlotData(closest)}\n`;
            }
        }
        userPrompt += "\n";
    }

    // List all slots to score
    userPrompt += "Slots to score:\n";
    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const isCtx = contextualSlotTimestamps?.has(slot.timestamp);
        const label = isCtx ? ` [CONTEXTUAL - outside daylight]` : "";
        userPrompt += `  ${i + 1}. ${formatSlotData(slot)}${label}\n`;
    }
    userPrompt += "\n";

    // Add 24h context after the day
    if (afterContext.length > 0) {
        userPrompt += "Context (following 24h):\n";
        const keyTimesAfter = [
            lastSlot.timestamp + 6 * 60 * 60 * 1000,
            lastSlot.timestamp + 12 * 60 * 60 * 1000,
            lastSlot.timestamp + 24 * 60 * 60 * 1000,
        ];
        for (const keyTime of keyTimesAfter) {
            const closest = afterContext.reduce((prev, curr) =>
                Math.abs(curr.timestamp - keyTime) < Math.abs(prev.timestamp - keyTime) ? curr : prev
            );
            if (closest && Math.abs(closest.timestamp - keyTime) < 2 * 60 * 60 * 1000) {
                const hoursAhead = Math.round((closest.timestamp - lastSlot.timestamp) / (60 * 60 * 1000));
                userPrompt += `  ${hoursAhead}h after last slot: ${formatSlotData(closest)}\n`;
            }
        }
        userPrompt += "\n";
    }

    userPrompt += `Respond with ONLY a JSON object (no markdown, no explanation outside JSON) containing a "scores" array with exactly ${slots.length} objects (one per slot, in order).\n`;
    userPrompt += "Each object must have:\n";
    userPrompt += '- score: integer 0-100\n';
    userPrompt += '- reasoning: string, 2-3 sentences, max 500 chars\n';
    userPrompt += '- factors: {"windQuality": <int>, "waveQuality": <int>, "tideQuality": <int>, "overallConditions": <int>} (all 0-100 numbers, NOT strings)\n';
    userPrompt += '\nExample: {"scores": [{"score": 72, "reasoning": "Solid wind with clean swell.", "factors": {"windQuality": 75, "waveQuality": 68, "tideQuality": 60, "overallConditions": 72}}, ...]}';

    return {
        system: fullSystemPrompt,
        user: userPrompt,
    };
}

