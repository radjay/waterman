// Inert stand-in for next/link in the design-system bundle.
//
// next/link reaches for the app router on click and pulls Next internals into
// the bundle. A plain anchor renders identically and keeps the bundle portable
// outside Next, which is where the design agent uses these components.
import { jsx } from 'react/jsx-runtime';

export default function Link({ href, children, prefetch, replace, scroll, shallow, locale, ...props }) {
  return jsx('a', { href: typeof href === 'string' ? href : '#', ...props, children });
}
