import * as React from 'react';

/**
 * SportSelector — from waterman@1.0.0.
 */
export interface SportSelectorProps {
onSportsChange: (...args: any[]) => void; value: unknown; className?: string;
}

export declare const SportSelector: React.ComponentType<SportSelectorProps>;
