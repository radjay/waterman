import * as React from 'react';

/**
 * ConditionLine — from waterman@1.0.0.
 */
export interface ConditionLineProps {
 /** Wind speed in knots */ speed: number;  /** Wind gust in knots */ gust: number;  /** Wind direction in degrees */ direction: number;  /** Wave height in meters */ waveHeight: number;  /** Wave period in seconds */ wavePeriod: number;  /** Sport type for display priority */ sport: string;  /** Additional CSS classes */ className?: string;
}

export declare const ConditionLine: React.ComponentType<ConditionLineProps>;
