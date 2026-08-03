import * as React from 'react';

/**
 * WebcamCard — from waterman@1.0.0.
 */
export interface WebcamCardProps {
 /** Webcam spot object */ spot: Record<string, unknown>;  /** Whether this webcam is in focus/fullscreen */ isFocused?: boolean;  /** Whether to show live/forecast buttons on hover */ showHoverButtons?: boolean;  /** Whether this spot is favorited by the user */ isFavorite?: boolean;  /** Callback when favorite button is clicked */ onToggleFavorite: (...args: any[]) => void; forecastData: unknown; onScoreClick: (...args: any[]) => void;
}

export declare const WebcamCard: React.ComponentType<WebcamCardProps>;
