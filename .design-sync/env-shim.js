// Imported first by .design-sync/entry.js, so it runs before any component
// module body. Next.js inlines NEXT_PUBLIC_* at build time; the design-sync
// bundle is a plain browser IIFE where `process` does not exist, so
// components/ConvexProvider.js (which constructs a Convex client at module
// scope) would throw a ReferenceError at import and blank every preview.
//
// The values deliberately point at the RFC-reserved .invalid TLD: previews get
// a well-formed client that never reaches a real deployment, so no environment
// values ship in the bundle and no preview issues live network calls.
globalThis.process ||= { env: {} };
globalThis.process.env ||= {};
globalThis.process.env.NEXT_PUBLIC_CONVEX_URL ||= 'https://ds-preview.invalid';
globalThis.process.env.NEXT_PUBLIC_APP_URL ||= 'https://ds-preview.invalid';
