import * as React from 'react';

/**
 * SportBadge — from waterman@1.0.0.
 */
export interface SportBadgeProps {
sport: "wingfoil"|"kitesurfing"|"surfing";  /** Icon size in px (default 14) */ size?: number;  /** Additional CSS classes */ className?: string;
}

export declare const SportBadge: React.ComponentType<SportBadgeProps>;
