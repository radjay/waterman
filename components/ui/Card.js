/**
 * Card component - general card container.
 *
 * Cards carry no shadow in either theme — separation is by border and fill.
 * `elevated` is kept for API compatibility but is no longer visually distinct
 * from `default`; the tinted `accent` variant is what draws the eye now.
 *
 * @param {"default"|"interactive"|"elevated"|"accent"} variant
 * @param {"sm"|"md"|"lg"|"xl"} radius - 14 / 16 / 18 / 20px
 * @param {React.ReactNode} children
 * @param {Function} onClick
 * @param {string} className - Additional CSS classes
 */
const RADIUS = {
  sm: "rounded-card-sm",
  md: "rounded-card",
  lg: "rounded-card-lg",
  xl: "rounded-card-xl",
};

export function Card({
  variant = "default",
  radius = "md",
  children,
  onClick,
  className = "",
}) {
  const baseStyles = `border ${RADIUS[radius] || RADIUS.md} p-4`;

  const variantStyles = {
    default: "bg-surface border-card",
    interactive:
      "bg-surface border-card hover:bg-ink-hover active:scale-[0.995] transition-all duration-base ease-smooth cursor-pointer",
    elevated: "bg-surface border-card",
    // Reserved for the one thing worth acting on.
    accent: "bg-accent-tint-card border-accent-border",
  };

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant] || variantStyles.default} ${
        onClick ? "text-left w-full" : ""
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
