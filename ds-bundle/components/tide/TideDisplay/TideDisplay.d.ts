import * as React from 'react';

/**
 * TideDisplay — from waterman@1.0.0.
 */
export interface TideDisplayProps {
 /** Tide object with {type, time, height, isExactTime, isRising, isFalling} */ tide: Record<string, unknown>;  /** Additional CSS classes */ className?: string;
}

export declare const TideDisplay: React.ComponentType<TideDisplayProps>;
