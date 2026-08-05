"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  FLAG_NAMES,
  flagDefault,
  overridesEnabled,
  readOverrides,
  writeOverride,
} from "../../lib/flags";

const FlagContext = createContext(null);

/**
 * Flag state.
 *
 * The build-time env value is authoritative on the server AND on the client's
 * first render. Overrides are applied only after mount, which keeps SSR and
 * hydration in agreement under `cacheComponents: true` — a flag read that
 * differed between server and client would produce a hydration mismatch on
 * every flagged surface.
 */
export function FlagProvider({ children }) {
  const defaults = useMemo(
    () => Object.fromEntries(FLAG_NAMES.map((name) => [name, flagDefault(name)])),
    []
  );
  const [flags, setFlags] = useState(defaults);

  useEffect(() => {
    if (!overridesEnabled()) return;
    const overrides = readOverrides(window.location.search);
    if (Object.keys(overrides).length) {
      setFlags((current) => ({ ...current, ...overrides }));
    }
  }, []);

  const value = useMemo(
    () => ({
      flags,
      canOverride: overridesEnabled(),
      setFlag: (name, enabled) => {
        if (!overridesEnabled()) return;
        writeOverride(name, enabled);
        setFlags((current) => ({ ...current, [name]: enabled }));
      },
      resetFlags: () => {
        if (!overridesEnabled()) return;
        FLAG_NAMES.forEach((name) => writeOverride(name, null));
        setFlags(defaults);
      },
    }),
    [flags, defaults]
  );

  return <FlagContext.Provider value={value}>{children}</FlagContext.Provider>;
}

/**
 * Read one flag.
 *
 * Safe outside a provider — falls back to the build-time default rather than
 * throwing, so a flagged component can never crash a page by being rendered in
 * an unexpected tree.
 */
export function useFlag(name) {
  const context = useContext(FlagContext);
  if (!context) return flagDefault(name);
  return Boolean(context.flags[name]);
}

export function useFlagAdmin() {
  return useContext(FlagContext);
}
