import * as React from 'react';

/**
 * ScoreModal — from waterman@1.0.0.
 */
export interface ScoreModalProps {
isOpen: boolean; onClose: (...args: any[]) => void; /** Score record: value 0-100 plus model reasoning and per-factor breakdown */ score: { value: number; reasoning?: string; isPersonalized?: boolean; factors?: { windQuality?: number; waveQuality?: number; tideQuality?: number } }; /** The forecast slot this score belongs to */ slot: { hour: string; sport: "wingfoil" | "kitesurfing" | "surfing" }; spotName?: string;
}

export declare const ScoreModal: React.ComponentType<ScoreModalProps>;
