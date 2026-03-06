import { SportBadge } from "./SportBadge";

/**
 * ScorePill component - pill-shaped sport icon + score display.
 *
 * @param {number} score - Condition score (0-100)
 * @param {"wingfoil"|"kitesurfing"|"surfing"} sport
 * @param {"sm"|"md"|"lg"|"xl"} size
 * @param {Function} onClick - Optional click handler (renders as button)
 * @param {string} className - Additional CSS classes
 */
export function ScorePill({ score, sport, size = "md", onClick, className = "" }) {
  if (!score || score < 60) return null;

  const colorClass =
    score >= 90
      ? "text-green-800 font-black"
      : score >= 75
        ? "text-green-700 font-bold"
        : "text-green-600 font-bold";

  const bgClass =
    score >= 90
      ? "bg-green-200/60 border-green-400/60"
      : score >= 75
        ? "bg-green-100/60 border-green-300/50"
        : "bg-green-50/50 border-green-200/40";

  const sizeConfig = {
    sm: { text: "text-[10px]", icon: 10, px: "px-1 py-px", gap: "gap-0.5" },
    md: { text: "text-xs", icon: 12, px: "px-1.5 py-0.5", gap: "gap-0.5" },
    lg: { text: "text-base", icon: 16, px: "px-2 py-0.5", gap: "gap-1" },
    xl: { text: "text-3xl", icon: 24, px: "px-3 py-1", gap: "gap-1.5" },
  };

  const s = sizeConfig[size] || sizeConfig.md;
  const Tag = onClick ? "button" : "span";

  return (
    <Tag
      onClick={onClick}
      className={`inline-flex items-center ${s.gap} ${s.px} rounded-full border ${bgClass} ${
        onClick ? "cursor-pointer hover:brightness-95 active:scale-[0.97] transition-all" : ""
      } ${className}`}
    >
      <SportBadge sport={sport} size={s.icon} className="text-ink" />
      <span className={`font-data tabular-nums leading-none ${colorClass} ${s.text}`}>
        {score}
      </span>
    </Tag>
  );
}
