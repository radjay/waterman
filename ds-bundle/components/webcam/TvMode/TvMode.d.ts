import * as React from 'react';

/**
 * TvMode — from waterman@1.0.0.
 */
export interface TvModeProps {
 /** Array of webcam spot objects */ webcams: unknown[];  /** Callback when TV mode is exited */ onClose: (...args: any[]) => void;
}

export declare const TvMode: React.ComponentType<TvModeProps>;
