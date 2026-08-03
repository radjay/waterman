// Downloads the app's three brand families from Google Fonts and writes a
// local @font-face stylesheet, so the design-system bundle ships its own fonts
// instead of depending on fonts.googleapis.com being reachable from wherever a
// design is rendered. cfg.extraFonts points at the generated CSS.
//
//   node .design-sync/fetch-fonts.mjs
//
// All three families are SIL Open Font License, which permits redistribution.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'fonts');
mkdirSync(OUT, { recursive: true });

// A modern browser UA is required — Google serves legacy ttf to unknown agents.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';

const SPEC =
  'family=Playfair+Display:wght@400;700;900&family=Courier+Prime:wght@400;700&family=Inter:wght@400;500;600;700&display=swap';

const res = await fetch(`https://fonts.googleapis.com/css2?${SPEC}`, { headers: { 'User-Agent': UA } });
if (!res.ok) throw new Error(`google fonts css: ${res.status}`);
let css = await res.text();

// Keep only latin / latin-ext blocks: the app is English/Dutch, and shipping
// every subset would multiply the bundle for glyphs no design will render.
const blocks = css.split(/(?=\/\*\s*[a-z-]+\s*\*\/)/).filter((b) => /\/\*\s*latin(-ext)?\s*\*\//.test(b));
css = blocks.join('');

const urls = [...css.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)].map((m) => m[1]);
const seen = new Map();
for (const url of urls) {
  if (seen.has(url)) continue;
  const name = url.split('/').slice(-3).join('-').replace(/[^\w.-]/g, '_');
  const bin = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!bin.ok) throw new Error(`${url}: ${bin.status}`);
  writeFileSync(join(OUT, name), Buffer.from(await bin.arrayBuffer()));
  seen.set(url, name);
}
for (const [url, name] of seen) css = css.split(url).join(`./${name}`);

writeFileSync(join(OUT, 'fonts.css'), css);
console.error(`wrote ${seen.size} woff2 + fonts.css to .design-sync/fonts/`);
