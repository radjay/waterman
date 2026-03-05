/**
 * FilterGroup — inline label + PillToggle on the same row.
 * Used for "Sport", "Conditions", etc.
 */
export function FilterGroup({ label, children, className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-[0.6rem] font-semibold uppercase tracking-widest text-faded-ink/50 leading-none whitespace-nowrap">
        {label}
      </span>
      {children}
    </div>
  );
}
