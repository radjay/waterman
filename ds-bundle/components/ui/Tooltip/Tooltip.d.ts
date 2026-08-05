import * as React from 'react';

/**
 * Tooltip — from waterman@1.0.0.
 */
export interface TooltipProps {
 /** The element to wrap with tooltip */ children?: React.ReactNode;  /** The tooltip text content */ content: string;  /** Position of tooltip: "top" | "bottom" | "left" | "right" */ position?: string;  /** Additional CSS classes for the wrapper */ className?: string;
}

export declare const Tooltip: React.ComponentType<TooltipProps>;
