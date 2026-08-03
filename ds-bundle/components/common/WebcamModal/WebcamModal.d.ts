import * as React from 'react';

/**
 * WebcamModal — from waterman@1.0.0.
 */
export interface WebcamModalProps {
isOpen: boolean; onClose: (...args: any[]) => void; webcamUrl: unknown; spotName: unknown; webcamStreamSource: unknown;
}

export declare const WebcamModal: React.ComponentType<WebcamModalProps>;
