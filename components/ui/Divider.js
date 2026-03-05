/**
 * Divider component - horizontal separator.
 *
 * @param {"light"|"medium"|"heavy"} weight
 * @param {string} className - Additional CSS classes
 */
export function Divider({ weight = "medium", className = "" }) {
  const styles = {
    light: "border-t border-ink/8",
    medium: "border-t border-ink/15",
    heavy: "border-t-2 border-ink/80",
  };

  return <div className={`${styles[weight] || styles.medium} ${className}`} />;
}
