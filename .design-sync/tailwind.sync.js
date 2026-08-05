// Tailwind config used only by the design-sync build. Extends the app's real
// config (tailwind.config.js is the source of truth for theme/plugins) and adds
// the authored preview sources to the content scan, so utility classes used
// only in preview cards are still emitted into the shipped stylesheet.
//
// The previews are passed as `raw` entries rather than as a glob on purpose:
// Tailwind globs with fast-glob, which skips dot-directories by default, so
// './.design-sync/previews/**' silently matched NOTHING. That failure is quiet
// — the class just never reaches the CSS and the cell renders unstyled — so
// keep the raw form unless you verify a glob actually matches.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import base from '../tailwind.config.js';

const PREVIEWS = join(dirname(fileURLToPath(import.meta.url)), 'previews');

let previewSources = [];
try {
  previewSources = readdirSync(PREVIEWS)
    .filter((f) => /\.(tsx|jsx)$/.test(f))
    .map((f) => ({ raw: readFileSync(join(PREVIEWS, f), 'utf8'), extension: 'tsx' }));
} catch {
  // no previews authored yet — the app globs below still apply
}

export default {
  ...base,
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    ...previewSources,
  ],
};
