import * as React from 'react';

/**
 * Button — from waterman@1.0.0.
 */
export interface ButtonProps {
variant?: "primary"|"secondary"|"ghost"|"danger"|"icon"; size?: "sm"|"md"|"lg";  /** Lucide icon component */ icon?: React.ComponentType; children?: React.ReactNode; onClick?: (...args: any[]) => void; disabled?: boolean;  /** Shows spinner and disables button */ loading?: boolean;  /** Makes button full width */ fullWidth?: boolean;  /** Button type (defaults to "button") */ type?: string;  /** Additional CSS classes */ className?: string; [key: string]: unknown;
}

export declare const Button: React.ComponentType<ButtonProps>;
