import { Loader2 } from "lucide-react";

/**
 * Button component - all button variants in the app.
 *
 * @param {"primary"|"secondary"|"ghost"|"danger"|"icon"} variant
 * @param {"sm"|"md"|"lg"} size
 * @param {React.ComponentType} icon - Lucide icon component
 * @param {React.ReactNode} children
 * @param {Function} onClick
 * @param {boolean} disabled
 * @param {boolean} loading - Shows spinner and disables button
 * @param {boolean} fullWidth - Makes button full width
 * @param {string} type - Button type (defaults to "button")
 * @param {string} className - Additional CSS classes
 */
export function Button({
  variant = "secondary",
  size = "md",
  icon: Icon,
  children,
  onClick,
  disabled = false,
  loading = false,
  fullWidth = false,
  type = "button",
  className = "",
  ...props
}) {
  const variantStyles = {
    // The full-width call to action. Accent fill with page-colour text —
    // needs the sport-pill treatment reasoning: accent-on-page reads in both
    // themes, accent-on-tint does not.
    primary:
      "bg-accent text-page rounded-pill font-bold tracking-[0.1em] uppercase font-data hover:brightness-110 active:scale-[0.98] focus-ring transition-all duration-fast ease-smooth",
    secondary:
      "border border-btn text-ink rounded-pill bg-transparent font-medium hover:bg-ink-hover active:scale-[0.98] focus-ring transition-all duration-fast ease-smooth",
    ghost:
      "text-faded-ink hover:text-ink rounded-ui focus-ring transition-all duration-fast ease-smooth",
    danger:
      "border border-marginal/40 text-marginal rounded-pill hover:bg-marginal/10 active:scale-[0.98] focus-ring transition-all duration-fast ease-smooth",
    icon:
      "border border-btn rounded-ui p-1.5 bg-transparent text-faded-ink hover:bg-ink-hover hover:text-ink focus-ring transition-all duration-fast ease-smooth inline-flex items-center justify-center",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-4 py-3 text-base",
  };

  // Icon variant ignores size padding (uses its own p-1)
  const sizeClass = variant === "icon" ? "" : sizeStyles[size] || sizeStyles.md;

  const iconSize = size === "sm" ? 14 : size === "lg" ? 18 : 16;

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`${variantStyles[variant] || variantStyles.secondary} ${sizeClass} ${
        isDisabled ? "opacity-50 cursor-not-allowed" : ""
      } ${Icon || loading ? "inline-flex items-center gap-2" : ""} ${
        fullWidth ? "w-full justify-center" : ""
      } ${className}`}
      {...props}
    >
      {loading ? <Loader2 size={iconSize} className="animate-spin" /> : Icon ? <Icon size={iconSize} /> : null}
      {children}
    </button>
  );
}
