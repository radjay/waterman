import * as React from 'react';

/**
 * ScoreCard — from waterman@1.0.0.
 */
export interface ScoreCardProps {
 /** Condition score (0-100) */ score: number; children?: React.ReactNode; onClick?: (...args: any[]) => void;  /** Additional CSS classes */ className?: string;
}

export declare const ScoreCard: React.ComponentType<ScoreCardProps>;
