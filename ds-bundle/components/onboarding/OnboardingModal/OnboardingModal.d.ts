import * as React from 'react';

/**
 * OnboardingModal — from waterman@1.0.0.
 */
export interface OnboardingModalProps {
onComplete: (...args: any[]) => void; onDismiss: (...args: any[]) => void; isDismissible?: boolean;
}

export declare const OnboardingModal: React.ComponentType<OnboardingModalProps>;
