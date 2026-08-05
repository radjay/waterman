import * as React from 'react';

/**
 * LiveWindIndicator — from waterman@1.0.0.
 */
export interface LiveWindIndicatorProps {
 /** Windguru station ID (extracted from liveReportUrl) */ stationId: string;  /** Additional CSS classes */ className?: string;  /** If true, show compact version (for overlays) */ compact?: boolean;
}

export declare const LiveWindIndicator: React.ComponentType<LiveWindIndicatorProps>;
