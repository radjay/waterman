/**
 * Switch — on/off control for settings toggles.
 *
 * The thumb is `knob` (opaque), not `surface`. Surface is a 5% wash, so an
 * on switch read as a bare accent pill. Off track uses `track-strong` so the
 * trough is visible in both themes.
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
      className={`relative w-11 h-6 rounded-full flex-none transition-colors duration-fast ease-smooth focus-ring border ${
        checked ? "bg-accent border-accent-border" : "bg-track-strong border-card"
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-knob border border-card transition-all duration-fast ease-smooth ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
