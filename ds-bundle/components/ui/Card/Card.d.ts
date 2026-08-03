import * as React from 'react';

/**
 * Card — from waterman@1.0.0.
 */
export interface CardProps {
variant?: "default"|"interactive"|"elevated"; children?: React.ReactNode; onClick?: (...args: any[]) => void;  /** Additional CSS classes */ className?: string;
}

export declare const Card: React.ComponentType<CardProps>;
