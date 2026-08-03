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
writeFileSync(
  cssPath,
  readFileSync(cssPath, 'utf8').replace(/@import\s+url\(["']?https:\/\/fonts\.googleapis\.com[^)]*\)\s*;/g, ''),
);
console.error('wrote .design-sync/.cache/tailwind.css');
