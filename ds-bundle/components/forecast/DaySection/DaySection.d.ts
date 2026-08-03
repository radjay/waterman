import * as React from 'react';

/**
 * DaySection — from waterman@1.0.0.
 */
export interface DaySectionProps {
 /** Day label (e.g., "Monday, January 1") */ day: string;  /** Legacy slots array (deprecated, use spotsData instead) */ slots: unknown[];  /** Object mapping spotId to array of forecast slots */ spotsData: Record<string, unknown>;  /** Currently selected sports */ selectedSports: Array<string>;  /** Map of spotId to spot metadata */ spotsMap?: Record<string, unknown>;  /** Filter mode: "best" or "all" */ showFilter?: string; tidesBySpot?: Record<string, unknown>;  /** Additional CSS classes */ className?: string; id?: string; isHighlighted?: boolean;  /** Whether the user is authenticated */ isAuthenticated?: boolean;
}

export declare const DaySection: React.ComponentType<DaySectionProps>;
