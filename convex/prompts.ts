/**
 * Prompt building utilities for LLM scoring.
 */

/**
 * System prompts for each sport (general evaluation guidelines).
 * These can be customized per spot in the database.
 */
export const SYSTEM_SPORT_PROMPTS = {
    wingfoil: `You are an expert wingfoiler evaluating conditions. Consider:
- Wind speed: 15-25 knots is ideal, but steady wind beats strong gusts
- Gust factor: Clean, consistent wind is much better than gusty conditions
- Wind direction: Cross-onshore or side-shore is ideal for most spots
- Overall: Safety, ride quality, and session enjoyment

Score 0-100:
- 90-100: Excellent conditions, rare day
- 75-89: Very good conditions, well worth it
- 60-74: Decent conditions, enjoyable session
- 40-59: Mediocre, rideable but nothing special
- 0-39: Poor conditions, best to skip

Write concise reasoning in a casual but informative tone. Be direct and practical. Avoid excessive slang or hype.`,

    surfing: `You are an experienced surfer evaluating conditions. Consider:
- Wave height: Right size for the spot - not too small, not too big
- Wave period: Longer periods (12+ sec) mean cleaner, more powerful waves
- Wave direction: Offshore or light onshore keeps things clean
- Tide: Depends on the spot - some work on low, others need high
- Overall: Wave quality, consistency, and session enjoyment

Score 0-100:
- 90-100: Excellent conditions, rare day
- 75-89: Very good waves, well worth it
- 60-74: Decent conditions, enjoyable session
- 40-59: Mediocre, waves are there but nothing special
- 0-39: Flat or messy, best to skip

Write concise reasoning in a casual but informative tone. Be direct and practical. Avoid excessive slang or hype.`,
};

/**
 * Default temporal prompt (can be customized per spot in database).
 */
export const DEFAULT_TEMPORAL_PROMPT = `Consider trends in conditions 72 hours before and 12 hours after the current time slot. 
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
 * Format a slot's condition data for the prompt.
 */
export function formatSlotData(slot: any): string {
    const date = new Date(slot.timestamp);
    const dateStr = date.toISOString().replace('T', ' ').substring(0, 16);
    
    const windCardinal = getCardinalDirection(slot.direction);
    let data = `${dateStr} - Wind: ${slot.speed} knots from ${windCardinal} (${slot.direction}°), Gust: ${slot.gust} knots`;
    
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
 * @param timeSeriesContext - Array of slots from 72h before to 12h after
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
            userPrompt += "Historical context (72h before):\n";
            // Show key points: 72h, 48h, 24h, 12h before if available
            const keyTimes = [
                currentSlot.timestamp - 72 * 60 * 60 * 1000,
                currentSlot.timestamp - 48 * 60 * 60 * 1000,
                currentSlot.timestamp - 24 * 60 * 60 * 1000,
                currentSlot.timestamp - 12 * 60 * 60 * 1000,
            ];

            for (const keyTime of keyTimes) {
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
            userPrompt += "Future context (12h after):\n";
            // Show 12h after if available
            const futureTime = currentSlot.timestamp + 12 * 60 * 60 * 1000;
            const closest = afterSlots.reduce((prev, curr) => 
                Math.abs(curr.timestamp - futureTime) < Math.abs(prev.timestamp - futureTime) ? curr : prev
            );
            if (closest && Math.abs(closest.timestamp - futureTime) < 2 * 60 * 60 * 1000) {
                const hoursAhead = Math.round((closest.timestamp - currentSlot.timestamp) / (60 * 60 * 1000));
                userPrompt += `${hoursAhead}h ahead: ${formatSlotData(closest)}\n`;
            }
        }
    }

    userPrompt += "\nProvide a JSON response with:\n";
    userPrompt += "- score: integer 0-100\n";
    userPrompt += "- reasoning: brief, practical explanation (1-2 sentences, max 200 chars)\n";
    userPrompt += "- factors: optional object with windQuality, waveQuality, tideQuality, overallConditions (each 0-100 number)";

    return {
        system: fullSystemPrompt,
        user: userPrompt,
    };
}

