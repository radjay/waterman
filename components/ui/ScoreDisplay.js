/**
 * ScoreDisplay component - the single consistent score indicator.
 * Shows a colored number based on score threshold.
 *
 * @param {number} score - Condition score (0-100)
 * @param {"sm"|"md"|"lg"} size
 * @param {string} className - Additional CSS classes
 */
export function ScoreDisplay({ score, size = "md", className = "" }) {
  if (!score || score < 60) return null;

  const colorClass =
    score >= 90
      ? "text-accent font-black"
      : score >= 75
        ? "text-accent font-bold"
        : "text-accent font-bold";

  const sizeClass =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base";

  return (
    <span className={`font-data tabular-nums leading-none ${colorClass} ${sizeClass} ${className}`}>
      {score}
    </span>
  );
}
