import * as React from 'react';

/**
 * ShareButton — from waterman@1.0.0.
 */
export interface ShareButtonProps {
 /** URL to share (default: current page URL) */ url: string;  /** Optional title for the Web Share API */ title?: string;  /** Additional CSS classes */ className?: string;
}

export declare const ShareButton: React.ComponentType<ShareButtonProps>;
