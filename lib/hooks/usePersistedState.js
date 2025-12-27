"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Custom hook for state that persists to localStorage.
 * Handles SSR-safe initialization and automatic persistence.
 * 
 * @param {string} key - localStorage key
 * @param {any} defaultValue - Default value if nothing in storage
 * @param {Function} validator - Optional function to validate stored value
 * @returns {[any, Function]} - [value, setValue] similar to useState
 * 
 * @example
 * const [sport, setSport] = usePersistedState('waterman_selected_sport', 'wingfoil', (val) => ['wingfoil', 'surfing'].includes(val));
 */
export function usePersistedState(key, defaultValue, validator = null) {
  // Initialize state with defaultValue (SSR-safe)
  const [state, setState] = useState(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);
  const validatorRef = useRef(validator);
  const hasLoadedRef = useRef(false);

  // Keep validator ref up to date
  useEffect(() => {
    validatorRef.current = validator;
  }, [validator]);

  // Load from localStorage after hydration (only once)
  useEffect(() => {
    if (hasLoadedRef.current) return;
    setIsHydrated(true);
    hasLoadedRef.current = true;
    
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        let parsed;
        try {
          // Try to parse as JSON first (for objects/arrays)
          parsed = JSON.parse(stored);
        } catch {
          // If parsing fails, use raw string
          parsed = stored;
        }
        
        // Validate if validator provided
        if (validatorRef.current) {
          if (validatorRef.current(parsed)) {
            setState(parsed);
          }
          // If validation fails, keep default value
        } else {
          setState(parsed);
        }
      }
    } catch (error) {
      // Ignore localStorage errors (e.g., in private browsing)
      console.warn(`Failed to load ${key} from localStorage:`, error);
    }
  }, [key]);

  // Save to localStorage whenever state changes (but only after hydration)
  useEffect(() => {
    if (!isHydrated) return;
    
    try {
      // Store as JSON if it's not a string, otherwise store as-is
      const toStore = typeof state === 'string' ? state : JSON.stringify(state);
      localStorage.setItem(key, toStore);
    } catch (error) {
      // Ignore localStorage errors (e.g., quota exceeded, private browsing)
      console.warn(`Failed to save ${key} to localStorage:`, error);
    }
  }, [state, key, isHydrated]);

  return [state, setState];
}

