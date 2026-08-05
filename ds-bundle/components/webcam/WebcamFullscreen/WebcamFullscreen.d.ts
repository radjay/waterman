import * as React from 'react';

/**
 * WebcamFullscreen — from waterman@1.0.0.
 */
export interface WebcamFullscreenProps {
 /** Webcam spot object */ spot: Record<string, unknown>;  /** Callback to close the modal */ onClose: (...args: any[]) => void;  /** Array of all available webcams for navigation */ allWebcams?: unknown[];  /** Callback to navigate to a different webcam */ onNavigate: (...args: any[]) => void;
}

export declare const WebcamFullscreen: React.ComponentType<WebcamFullscreenProps>;
