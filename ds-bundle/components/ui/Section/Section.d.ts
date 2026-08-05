import * as React from 'react';

/**
 * Section — from waterman@1.0.0.
 */
export interface SectionProps {
 /** Section heading text */ title?: string;  /** Action element (e.g. "See All" button) */ action: React.ReactNode; children?: React.ReactNode;  /** Show divider above section */ divided?: boolean;  /** Additional CSS classes */ className?: string;
}

export declare const Section: React.ComponentType<SectionProps>;
