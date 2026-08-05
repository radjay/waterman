import * as React from 'react';

/**
 * WindGroup — from waterman@1.0.0.
 */
export interface WindGroupProps {
speed: unknown; gust: unknown; direction: unknown; showGust?: boolean; className?: string;
}

export declare const WindGroup: React.ComponentType<WindGroupProps>;
