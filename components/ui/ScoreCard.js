/**
 * ScoreCard component - card with score-based background tinting and left border.
 *
 * @param {number} score - Condition score (0-100)
 * @param {React.ReactNode} children
 * @param {Function} onClick
 * @param {string} className - Additional CSS classes
 */
export function ScoreCard({ score, children, onClick, className = "" }) {
  const bgClass =
    score >= 90
      ? "bg-[rgba(134,239,172,0.18)]"
      : score >= 75
        ? "bg-[rgba(134,239,172,0.08)]"
        : "bg-newsprint";

  const borderClass =
    score >= 90
      ? "border-l-4 border-l-amber-500"
      : score >= 75
        ? "border-l-4 border-l-green-600"
        : score >= 60
          ? "border-l-4 border-l-green-400"
          : "";

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className={`border border-ink/10 rounded-card p-3 shadow-card ${bgClass} ${borderClass} ${
        onClick ? "hover:shadow-card-hover hover:border-ink/20 active:scale-[0.995] transition-all duration-base ease-smooth cursor-pointer text-left w-full" : ""
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
