import { Heading } from "./Heading";
import { Divider } from "./Divider";

/**
 * Section component - section wrapper with optional title, action, and divider.
 *
 * @param {string} title - Section heading text
 * @param {React.ReactNode} action - Action element (e.g. "See All" button)
 * @param {React.ReactNode} children
 * @param {boolean} divided - Show divider above section
 * @param {string} className - Additional CSS classes
 */
export function Section({ title, action, children, divided = false, className = "" }) {
  return (
    <section className={className}>
      {divided && <Divider className="mb-6" />}
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          {title && <Heading level={2}>{title}</Heading>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
