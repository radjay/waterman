import * as React from 'react';

/**
 * Toast — from waterman@1.0.0.
 */
export interface ToastProps {
message: unknown; type?: string; onClose: (...args: any[]) => void; duration?: number;
}

export declare const Toast: React.ComponentType<ToastProps>;
