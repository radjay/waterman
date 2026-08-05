import * as React from 'react';

/**
 * ForecastSlot — from waterman@1.0.0.
 */
export interface ForecastSlotProps {
 /** Forecast slot data with timestamp, speed, gust, direction, wave data, etc. */ slot: Record<string, unknown>;  /** Nearby tide information (for surfing spots) */ nearbyTide: Record<string, unknown>|null;  /** Whether this is a surfing spot */ isSurfing?: boolean;  /** Filter mode: "best" (only ideal conditions) or "all" (all conditions) */ showFilter?: string;  /** Name of the spot (for score modal) */ spotName?: string;  /** Additional CSS classes */ className?: string;
}

export declare const ForecastSlot: React.ComponentType<ForecastSlotProps>;
