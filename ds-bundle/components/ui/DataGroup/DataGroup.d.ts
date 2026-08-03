import * as React from 'react';

/**
 * DataGroup — from waterman@1.0.0.
 */
export interface DataGroupProps {
 /** Icon component */ icon?: ReactNode;  /** Metric value/content */ children?: ReactNode;  /** Direction in degrees (optional) */ direction: number;  /** Whether to show direction indicator */ showDirection?: boolean; gap?: string;  /** Additional CSS classes */ className?: string;
}

export declare const DataGroup: React.ComponentType<DataGroupProps>;
