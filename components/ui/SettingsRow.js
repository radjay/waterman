import { Check, ChevronRight } from "lucide-react";

/**
 * One row in Settings (and similar preference lists).
 *
 * Selected and idle share the same Card chrome — accent tint when chosen,
 * surface + border-card otherwise — so Appearance, sports, and spots read as
 * one page instead of three different selected treatments.
 *
 * @param {string} title
 * @param {string} [hint]
 * @param {boolean} [selected]
 * @param {Function} [onClick]
 * @param {React.ReactNode} [leading]
 * @param {"check"|"chevron"|React.ReactNode} [trailing]
 * @param {"button"|"switch"} [role]
 * @param {boolean} [pressed]  For role="switch" — aria-checked
 * @param {string} [className]
 */
export function SettingsRow({
  title,
  hint,
  selected = false,
  onClick,
  leading = null,
  trailing = null,
  role = "button",
  pressed,
  className = "",
}) {
  const isSwitch = role === "switch";
  // Choice rows tint when selected; switch rows stay neutral — the control itself
  // carries on/off so the whole row does not light up as a "selected" choice.
  const active = isSwitch ? false : selected;
  // Switch rows are a div so the Switch control can be a real button without
  // nesting interactive elements.
  const Tag = isSwitch ? "div" : "button";

  const trailingNode =
    trailing === "check" ? (
      active ? <Check size={18} className="text-accent flex-none" strokeWidth={2.5} /> : null
    ) : trailing === "chevron" ? (
      <ChevronRight size={18} className="text-dim flex-none" />
    ) : (
      trailing
    );

  return (
    <Tag
      type={isSwitch ? undefined : "button"}
      onClick={onClick}
      onKeyDown={
        isSwitch && onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      tabIndex={isSwitch ? 0 : undefined}
      aria-pressed={isSwitch ? undefined : selected}
      aria-checked={isSwitch ? Boolean(pressed) : undefined}
      role={isSwitch ? "switch" : undefined}
      className={`w-full flex items-center gap-3 text-left rounded-card border px-[14px] py-[13px] transition-colors duration-fast ease-smooth focus-ring ${
        active
          ? "border-accent-border bg-accent-tint-card"
          : "border-card bg-surface hover:bg-ink-hover"
      } ${isSwitch ? "cursor-pointer" : ""} ${className}`}
    >
      {leading}
      <span className="flex-1 min-w-0">
        <span
          className={`block text-[13px] font-medium ${
            active ? "text-accent" : "text-ink"
          }`}
        >
          {title}
        </span>
        {hint ? (
          <span className="block font-data text-[10px] text-faded-ink mt-0.5">
            {hint}
          </span>
        ) : null}
      </span>
      {trailingNode}
    </Tag>
  );
}
