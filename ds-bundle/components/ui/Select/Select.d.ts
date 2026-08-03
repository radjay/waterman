import * as React from 'react';

/**
 * Select — from waterman@1.0.0.
 */
export interface SelectProps {
 /** Array of {id, label} objects */ options: unknown[];  /** Current selected value (controlled) */ value: string;  /** Callback when value changes */ onChange: (...args: any[]) => void;  /** Additional CSS classes */ className?: string;
}

export declare const Select: React.ComponentType<SelectProps>;
