import * as React from 'react';

/**
 * Input — from waterman@1.0.0.
 */
export interface InputProps {
 /** Lucide icon component */ icon?: React.ComponentType; placeholder?: string; value: string; onChange: (...args: any[]) => void;  /** Input type (defaults to "text") */ type?: string;  /** Renders textarea instead of input */ multiline?: boolean;  /** Number of rows for textarea (defaults to 4) */ rows?: number;  /** Read-only state */ readOnly?: boolean;  /** Disabled state */ disabled?: boolean;  /** Additional CSS classes */ className?: string; [key: string]: unknown;
}

export declare const Input: React.ComponentType<InputProps>;
