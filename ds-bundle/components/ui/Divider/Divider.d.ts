import * as React from 'react';

/**
 * Divider — from waterman@1.0.0.
 */
export interface DividerProps {
weight?: "light"|"medium"|"heavy";  /** Additional CSS classes */ className?: string;
}

export declare const Divider: React.ComponentType<DividerProps>;
