/**
 * Card component - general card container.
 *
 * @param {"default"|"interactive"|"elevated"} variant
 * @param {React.ReactNode} children
 * @param {Function} onClick
 * @param {string} className - Additional CSS classes
 */
export function Card({ variant = "default", children, onClick, className = "" }) {
  const baseStyles = "border border-ink/10 rounded-card p-4 bg-newsprint";

  const variantStyles = {
    default: "shadow-card",
    interactive:
      "shadow-card hover:shadow-card-hover hover:border-ink/20 active:scale-[0.995] transition-all duration-base ease-smooth cursor-pointer",
    elevated: "shadow-elevated",
  };

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant] || ""} ${onClick ? "text-left w-full" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}
