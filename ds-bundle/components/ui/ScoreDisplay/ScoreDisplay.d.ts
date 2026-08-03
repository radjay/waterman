import * as React from 'react';

/**
 * ScoreDisplay — from waterman@1.0.0.
 */
export interface ScoreDisplayProps {
 /** Condition score (0-100) */ score: number; size?: "sm"|"md"|"lg";  /** Additional CSS classes */ className?: string;
}

export declare const ScoreDisplay: React.ComponentType<ScoreDisplayProps>;
