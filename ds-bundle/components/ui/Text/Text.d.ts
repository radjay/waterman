import * as React from 'react';

/**
 * Text — from waterman@1.0.0.
 */
export interface TextProps {
variant?: "body"|"muted"|"caption"|"label";  /** HTML tag (defaults to "p") */ as?: string; children?: React.ReactNode;  /** Additional CSS classes */ className?: string;
}

export declare const Text: React.ComponentType<TextProps>;
