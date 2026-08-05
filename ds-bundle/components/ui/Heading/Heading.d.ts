import * as React from 'react';

/**
 * Heading — from waterman@1.0.0.
 */
export interface HeadingProps {
 /** Heading level (1-4) */ level?: number; children?: React.ReactNode;  /** Additional CSS classes */ className?: string;
}

export declare const Heading: React.ComponentType<HeadingProps>;
