import * as React from 'react';

/**
 * ScorePill — from waterman@1.0.0.
 */
export interface ScorePillProps {
 /** Condition score (0-100) */ score: number; sport: "wingfoil"|"kitesurfing"|"surfing"; size?: "sm"|"md"|"lg"|"xl";  /** If true, show scores below 60 too */ showAll?: boolean;  /** Optional click handler (renders as button) */ onClick?: (...args: any[]) => void;  /** Additional CSS classes */ className?: string;
}

export declare const ScorePill: React.ComponentType<ScorePillProps>;
