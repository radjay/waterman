"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Reusable select component with localStorage persistence.
 * 
 * @param {Array} options - Array of {id, label} objects
 * @param {string} value - Current selected value
 * @param {Function} onChange - Callback when value changes
 * @param {string} storageKey - localStorage key for persistence
 * @param {string} defaultValue - Default value if nothing in storage
 * @param {string} className - Additional CSS classes
 */
export function Select({ 
  options, 
  value, 
  onChange, 
  storageKey, 
  defaultValue,
  className = "" 
}) {
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);
  const onChangeRef = useRef(onChange);
  const hasInitializedRef = useRef(false);

  // Keep onChange ref up to date without causing re-renders
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Load from localStorage after hydration
  useEffect(() => {
    setIsHydrated(true);
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored && options.some(opt => opt.id === stored)) {
        setSelectedValue(stored);
        if (!hasInitializedRef.current && onChangeRef.current) {
          // Use setTimeout to avoid calling during render
          setTimeout(() => {
            if (onChangeRef.current) {
              onChangeRef.current(stored);
            }
          }, 0);
          hasInitializedRef.current = true;
        }
        return;
      }
    }
    // Notify parent of default on first load (only once)
    if (!hasInitializedRef.current && onChangeRef.current) {
      // Use setTimeout to avoid calling during render
      setTimeout(() => {
        if (onChangeRef.current) {
          onChangeRef.current(defaultValue);
        }
      }, 0);
      hasInitializedRef.current = true;
    }
  }, [storageKey, defaultValue, options]);

  useEffect(() => {
    // Save to localStorage whenever selection changes (but only after hydration)
    if (isHydrated && storageKey && selectedValue !== defaultValue) {
      localStorage.setItem(storageKey, selectedValue);
    }
  }, [selectedValue, isHydrated, storageKey, defaultValue]);

  const handleChange = (newValue) => {
    setSelectedValue(newValue);
    // Call onChange immediately when user changes the value
    if (onChangeRef.current) {
      onChangeRef.current(newValue);
    }
  };

  return (
    <div className={className}>
      <div className="relative inline-block">
        <select
          value={value || selectedValue}
          onChange={(e) => handleChange(e.target.value)}
          className="px-3 pr-8 py-1 rounded border border-ink/30 bg-newsprint text-ink font-body font-medium text-xs uppercase cursor-pointer focus:outline-none focus:border-ink hover:bg-ink/5 appearance-none"
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
    </div>
  );
}

