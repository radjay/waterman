"use client";

/**
 * Simple controlled select component.
 * Pure UI component with no business logic.
 * 
 * @param {Array} options - Array of {id, label} objects
 * @param {string} value - Current selected value (controlled)
 * @param {Function} onChange - Callback when value changes
 * @param {string} className - Additional CSS classes
 */
export function Select({ 
  options, 
  value, 
  onChange, 
  className = "" 
}) {
  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div className={className}>
      <div className="relative inline-block">
        <select
          value={value || ""}
          onChange={handleChange}
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
