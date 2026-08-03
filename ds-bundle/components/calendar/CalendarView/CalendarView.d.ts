import * as React from 'react';

/**
 * CalendarView — from waterman@1.0.0.
 */
export interface CalendarViewProps {
 /** Object mapping day strings to spot data */ grouped: Record<string, unknown>;  /** Sorted array of day strings */ sortedDays: unknown[];  /** Map of spotId to spot metadata */ spotsMap: Record<string, unknown>;  /** All sports (always ["wingfoil", "surfing"] for calendar) */ selectedSports: Array<string>;  /** Callback when a day is clicked (deprecated, use onSpotClick instead) */ onDayClick: (...args: any[]) => void;  /** Callback when a spot/sport combo is clicked (sport, dayStr) */ onSpotClick: (...args: any[]) => void;
}

export declare const CalendarView: React.ComponentType<CalendarViewProps>;
