import * as React from 'react';

/**
 * Modal — from waterman@1.0.0.
 */
export interface ModalProps {
isOpen: boolean; onClose: (...args: any[]) => void; size?: string; children?: React.ReactNode; className?: string;
}

export declare const Modal: React.ComponentType<ModalProps>;
