// design-sync prep build for the waterman repo (cfg.buildCmd).
//
// This repo is a Next.js app, not a published component package: there is no
// dist/ and no compiled stylesheet on disk. This script produces the three
// inputs the converter needs, and must run before package-build.mjs on every
// sync:
//
//   1. .design-sync/entry.js             — barrel re-exporting every component
//   2. .design-sync/.cache/dist/index.js — that barrel compiled to plain ESM
//                                          (cfg entry; JSX compiled away)
//   3. .design-sync/.cache/tailwind.css  — app/globals.css compiled by Tailwind
//                                          (cfg.cssEntry points here)
//
// Why step 2: components are .js files containing JSX. esbuild only applies the
// jsx loader to .jsx/.tsx by extension, and the converter's bundler (lib/
// bundle.mjs) defines the output contract and must not be forked — so we hand
// it an already-compiled ESM entry, exactly as a published package would ship.
// Bare imports stay external so the converter still resolves and bundles
// react/lucide-react/convex/etc. itself.
//
// Run from the repo root:  node .design-sync/build.mjs
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const require = createRequire(join(ROOT, 'package.json'));
const esbuild = await import(require.resolve('esbuild'));

// 1. barrel
execFileSync(process.execPath, [join(HERE, 'make-entry.mjs')], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });

// 2. compile JSX → ESM, keeping package imports external
mkdirSync(join(HERE, '.cache/dist'), { recursive: true });
await esbuild.build({
  entryPoints: [join(HERE, 'entry.js')],
  outfile: join(HERE, '.cache/dist/index.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic', // components rely on the Next.js automatic runtime (no React import)
  loader: { '.js': 'jsx' },
  packages: 'external',
  // env-shim must stay a SEPARATE module, not be inlined. ESM evaluates a
  // module's imports before its own body, so an inlined shim would run after
  // every component (and after next/*, convex/*) had already read process at
  // module scope — which is exactly what throws in a browser bundle. Left
  // external, it stays the entry's first import and therefore runs first.
  external: ['./env-shim.js'],
  // Next.js routing is app infrastructure, not part of the design system's
  // contract. The real modules throw outside a mounted Next app and blank the
  // previews; the stubs keep the bundle portable wherever the design agent
  // builds with it. See .design-sync/stubs/.
  alias: {
    'next/navigation': join(HERE, 'stubs/next-navigation.js'),
    'next/link': join(HERE, 'stubs/next-link.js'),
  },
  logLevel: 'warning',
});
copyFileSync(join(HERE, 'env-shim.js'), join(HERE, '.cache/dist/env-shim.js'));
console.error('wrote .design-sync/.cache/dist/index.js');

// 3. stylesheet
execFileSync(
  join(ROOT, 'node_modules/.bin/tailwindcss'),
  [
    '--config', '.design-sync/tailwind.sync.js',
    '--input', 'app/globals.css',
    '--output', '.design-sync/.cache/tailwind.css',
    '--minify',
  ],
  { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] },
);

// The app pulls its three brand families from fonts.googleapis.com. The bundle
// ships them locally instead (cfg.extraFonts → .design-sync/fonts/), so designs
// render in the real brand fonts even where that host is unreachable. Drop the
// remote @import from the synced copy so the two declarations cannot compete.
// app/globals.css itself is untouched — this only rewrites the build artifact.
const cssPath = join(HERE, '.cache/tailwind.css');
let css = readFileSync(cssPath, 'utf8').replace(
  /@import\s+url\(["']?https:\/\/fonts\.googleapis\.com[^)]*\)\s*;/g,
  '',
);

// next/font sets --font-display / --font-body / --font-mono on the <html> class
// from app/layout.js. Nothing outside Next does, and Tailwind's font-headline,
// font-body and font-data ALL resolve through those three vars — so without
// this block every card in the design system renders in the browser default
// while the woff2s sit unused in fonts/.
//
// It goes here rather than in fonts.css because the converter's font scrape
// keeps only @font-face rules and discards everything else in that file.
// A class selector still wins inside the real app, so this is a fallback, not
// an override. Families must match the next/font calls in app/layout.js.
// The preview harness hard-codes `body{background:#fff}`, and app/theme.css
// makes NIGHTGLASS the `:root` default — so every card rendered near-white ink
// on a white page and was effectively blank. Re-scope the Dayglass block to
// plain `:root` here so the synced stylesheet defaults to the light theme,
// which is what a design composed on white actually wants.
//
// `:root[data-theme="night"]` and `[data-theme="day"]` both out-specify a bare
// `:root`, so BOTH themes still work — only the default flips, and only in the
// synced copy. app/theme.css is untouched.
const themeCss = readFileSync(join(ROOT, 'app/theme.css'), 'utf8');
const dayStart = themeCss.indexOf(':root[data-theme="day"]');
if (dayStart === -1) throw new Error('theme.css: no [data-theme="day"] block — did the token file move?');
const dayBody = themeCss.slice(themeCss.indexOf('{', dayStart) + 1, themeCss.indexOf('\n}', dayStart));
css += `:root{${dayBody}}`;

css +=
  `:root{--font-display:'Bricolage Grotesque';` +
  `--font-body:'Space Grotesk';` +
  `--font-mono:'JetBrains Mono';}`;

writeFileSync(cssPath, css);
console.error('wrote .design-sync/.cache/tailwind.css');
