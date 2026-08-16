/**
 * Switch — on/off control for settings toggles.
 *
 * Theme tokens only: track is ink when on, track muted when off; thumb is
 * surface so both Nightglass and Dayglass stay readable.
 *
 * @param {boolean} checked
 * @param {Function} onChange
 * @param {string} [ariaLabel]
 * @param {string} [className]
 */
export function Switch({ checked, onChange, ariaLabel, className = "" }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.(!checked);
      }}
      className={`relative w-11 h-6 rounded-full flex-none transition-colors duration-fast ease-smooth focus-ring ${
        checked ? "bg-accent" : "bg-track"
      } ${className}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-surface shadow-card transition-all duration-fast ease-smooth ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
