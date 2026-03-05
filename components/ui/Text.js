/**
 * Text component - consistent body text styles.
 *
 * @param {"body"|"muted"|"caption"|"label"} variant
 * @param {string} as - HTML tag (defaults to "p")
 * @param {React.ReactNode} children
 * @param {string} className - Additional CSS classes
 */
export function Text({ variant = "body", as: Tag = "p", children, className = "" }) {
  const styles = {
    body: "font-body text-ink leading-relaxed",
    muted: "font-body text-faded-ink leading-relaxed",
    caption: "font-body text-xs text-ink/50 leading-normal",
    label: "font-body text-xs font-semibold uppercase tracking-wider text-ink/50",
  };

  return <Tag className={`${styles[variant] || styles.body} ${className}`}>{children}</Tag>;
}
