import { MicroLabel } from "./MicroLabel";

/**
 * A labelled block of settings rows — APPEARANCE, FAVORITE SPORTS, etc.
 *
 * Section labels are always MicroLabel (ALL CAPS, font-data) so Settings matches
 * More, Now, and every other screen that groups rows under a micro label.
 *
 * @param {string} label
 * @param {React.ReactNode} children
 * @param {string} [className]
 */
export function SettingsSection({ label, children, className = "" }) {
  return (
    <section className={className}>
      <MicroLabel as="h2" className="mb-3">
        {label}
      </MicroLabel>
      {children}
    </section>
  );
}
