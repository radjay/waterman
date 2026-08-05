import * as React from 'react';

/**
 * FilterBar — from waterman@1.0.0.
 */
export interface FilterBarProps {
children?: React.ReactNode; actions: unknown;  /** labels to show when collapsed (e.g. ["Wing", "Best"]) */ activeFilters?: string[]; className?: string;
}

export declare const FilterBar: React.ComponentType<FilterBarProps>;
