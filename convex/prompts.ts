/**
 * Prompt building utilities for LLM scoring.
 */

/**
 * System prompts for each sport (general evaluation guidelines).
 * These can be customized per spot in the database.
 */
export const SYSTEM_SPORT_PROMPTS = {
    wingfoil: `You are an expert wingfoiling condition evaluator. Evaluate conditions considering:
- Wind speed: Higher speeds (15-25 knots) are ideal, but consistency matters more than peak speed
- Wind gusts: Steady wind (small difference between speed and gust) is preferred over gusty conditions
- Wind direction: Consistency and onshore/cross-onshore directions are best
- Overall conditions: Consider safety, ride quality, and session enjoyment

Provide a score from 0-100 where:
- 90-100: Exceptional conditions (epic day)
- 75-89: Excellent conditions (ideal)
- 60-74: Good conditions (meets criteria)
- 40-59: Marginal conditions (usable but not ideal)
- 0-39: Poor conditions (doesn't meet criteria)`,

    surfing: `You are an expert surfing condition evaluator. Evaluate conditions considering:
- Wave height: Appropriate size for the spot (not too small, not too large)
- Wave period: Longer periods (12+ seconds) indicate better quality swells
- Wave direction: Onshore/cross-onshore directions work best for most spots
- Tide: High or low tide may be optimal depending on the spot
- Overall conditions: Consider wave quality, consistency, and safety

Provide a score from 0-100 where:
- 90-100: Exceptional conditions (epic day)
- 75-89: Excellent conditions (ideal)
- 60-74: Good conditions (meets criteria)
- 40-59: Marginal conditions (usable but not ideal)
- 0-39: Poor conditions (doesn't meet criteria)`,
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
 * Format a slot's condition data for the prompt.
 */
export function formatSlotData(slot: any): string {
    const date = new Date(slot.timestamp);
    const dateStr = date.toISOString().replace('T', ' ').substring(0, 16);
    
    let data = `${dateStr} - Wind: ${slot.speed} knots, Gust: ${slot.gust} knots, Direction: ${slot.direction}°`;
    
    if (slot.waveHeight !== undefined) {
        data += `, Waves: ${slot.waveHeight}m`;
    }
    if (slot.wavePeriod !== undefined) {
        data += `, Period: ${slot.wavePeriod}s`;
    }
    if (slot.waveDirection !== undefined) {
        data += `, Wave Dir: ${slot.waveDirection}°`;
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
    userPrompt += "- reasoning: brief explanation (1-2 sentences, max 200 characters)\n";
    userPrompt += "- factors: optional object with windQuality, waveQuality, tideQuality, overallConditions (each 0-100 number)";

    return {
        system: fullSystemPrompt,
        user: userPrompt,
    };
}

