"use client";

import { usePersistedState } from "./usePersistedState";

export const SELECTED_SPOT_KEY = "waterman_selected_spot";

/**
 * The spot the app is currently speaking for, shared across tabs.
 *
 * Now, Live and Spot forecast are three views of one choice, and it has to
 * survive the walk between them — tapping LIVE on Saturday's row in the spot
 * forecast has to land on Now for THAT beach, not on whatever Now was showing
 * an hour ago. Persisted rather than routed because it is a preference, not an
 * address; the shareable address is the slug in /report/[spot].
 *
 * Returns [id|null, setId]. Null means "we have not chosen yet" — the screen
 * picks the best-scoring spot and leaves the choice unmade, so the app keeps
 * answering "can I go" rather than "how is the spot you last looked at".
 */
export function useSelectedSpot() {
  return usePersistedState(SELECTED_SPOT_KEY, null, (v) => typeof v === "string");
}
