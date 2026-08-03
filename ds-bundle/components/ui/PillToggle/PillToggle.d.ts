import * as React from 'react';

/**
 * PillToggle — from waterman@1.0.0.
 */
export interface PillToggleProps {
options: unknown[];  /** Currently selected option id */ value: string;  /** Called with selected option id */ onChange: (...args: any[]) => void;  /** Unique name for animation (each PillToggle on the page needs a different name) */ name?: string;  /** Additional CSS classes */ className?: string;
}

export declare const PillToggle: React.ComponentType<PillToggleProps>;
