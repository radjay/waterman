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
    primary:
      "bg-ink text-newsprint rounded-ui font-medium shadow-card hover:bg-ink-hover hover:shadow-card-hover active:scale-[0.98] focus-ring transition-all duration-fast ease-smooth",
    secondary:
      "border border-ink/15 text-ink rounded-ui bg-newsprint font-medium hover:border-ink/25 hover:bg-warm-highlight active:scale-[0.98] focus-ring transition-all duration-fast ease-smooth",
    ghost:
      "text-faded-ink hover:text-ink rounded-ui focus-ring transition-all duration-fast ease-smooth",
    danger:
      "border border-red-accent/30 text-red-accent rounded-ui hover:bg-red-accent/5 active:scale-[0.98] focus-ring transition-all duration-fast ease-smooth",
    icon:
      "border border-ink/15 rounded-ui p-1.5 bg-newsprint hover:bg-warm-highlight focus-ring transition-all duration-fast ease-smooth inline-flex items-center justify-center",
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
