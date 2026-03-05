/**
 * Heading component - consistent heading styles across the app.
 *
 * @param {number} level - Heading level (1-4)
 * @param {React.ReactNode} children
 * @param {string} className - Additional CSS classes
 */
export function Heading({ level = 2, children, className = "" }) {
  const styles = {
    1: "font-headline text-3xl font-bold text-ink tracking-tight",
    2: "font-headline text-xl font-bold text-ink tracking-tight",
    3: "font-headline text-lg font-semibold text-ink",
    4: "font-headline text-base font-semibold text-ink",
  };

  const Tag = `h${level}`;
  return <Tag className={`${styles[level] || styles[2]} ${className}`}>{children}</Tag>;
}
