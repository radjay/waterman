// Generates the cfg.dtsPropsFor block for .design-sync/config.json.
//
// The converter extracts <Name>Props from a package's shipped .d.ts tree. This
// repo is plain JS with no declarations, so that extraction yields an empty
// `[key: string]: unknown` — no API contract for the design agent at all. This
// script recovers the real contract from the two places it actually lives in
// the source: the destructured parameter list (names + defaults) and the
// JSDoc @param tags above it.
//
//   node .design-sync/make-dts-props.mjs > /tmp/props.json
//
// Output is reviewed and merged into config.json by hand — treat it as a
// starting point, not gospel. Hand edits in config.json win; re-run only when
// components change, and re-merge rather than overwrite.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '../components');

const walk = (d, out = []) => {
  for (const n of readdirSync(d).sort()) {
    const p = join(d, n);
    statSync(p).isDirectory() ? walk(p, out) : n.endsWith('.js') && out.push(p);
  }
  return out;
};

// ── JSDoc {type} → TypeScript ────────────────────────────────────────────────
function jsdocType(raw) {
  if (!raw) return null;
  let t = raw.trim();
  if (/^Function$/i.test(t)) return '(...args: any[]) => void';
  if (/^Object$/i.test(t)) return 'Record<string, unknown>';
  if (/^Array$/i.test(t)) return 'unknown[]';
  if (/^\*$/.test(t)) return 'unknown';
  if (/^any$/i.test(t)) return 'unknown';
  // {Array<Foo>} / {Foo[]} pass through; {React.X} pass through
  t = t.replace(/\bObject\b/g, 'Record<string, unknown>');
  return t;
}

// ── infer a type from a default value expression ─────────────────────────────
function inferFromDefault(expr) {
  if (expr == null) return null;
  const e = expr.trim();
  if (/^(true|false)$/.test(e)) return 'boolean';
  if (/^-?\d+(\.\d+)?$/.test(e)) return 'number';
  if (/^["'`]/.test(e)) return 'string';
  if (/^\[/.test(e)) return 'unknown[]';
  if (/^\{/.test(e)) return 'Record<string, unknown>';
  if (/^\(\s*\)\s*=>/.test(e) || /^function\b/.test(e)) return '(...args: any[]) => void';
  if (e === 'null' || e === 'undefined') return null;
  return null;
}

// Split a destructured param list on top-level commas (defaults may contain
// commas inside {}, [], () or strings).
function splitTop(s) {
  const out = [];
  let depth = 0, quote = null, cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      cur += c;
      if (c === quote && s[i - 1] !== '\\') quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; cur += c; continue; }
    if ('{[('.includes(c)) depth++;
    if ('}])'.includes(c)) depth--;
    if (c === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

// Find the destructured object literal for a component's parameter list.
function paramBlock(text, name) {
  const pats = [
    new RegExp(`export\\s+(?:default\\s+)?function\\s+${name}\\s*\\(`),
    new RegExp(`export\\s+(?:default\\s+)?(?:const|let|var)\\s+${name}\\s*=\\s*(?:\\([^)]*\\)\\s*=>|function\\s*\\()`),
    new RegExp(`function\\s+${name}\\s*\\(`),
    new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*\\(`),
  ];
  for (const re of pats) {
    const m = re.exec(text);
    if (!m) continue;
    let i = text.indexOf('(', m.index + m[0].length - 1);
    if (i < 0) continue;
    // walk to the matching close paren
    let depth = 0;
    for (let j = i; j < text.length; j++) {
      if (text[j] === '(') depth++;
      else if (text[j] === ')') {
        depth--;
        if (depth === 0) {
          const inner = text.slice(i + 1, j).trim();
          return inner.startsWith('{') ? inner.slice(1, inner.lastIndexOf('}')) : '';
        }
      }
    }
  }
  return null;
}

// Leading JSDoc block immediately above the component declaration.
function jsdocFor(text, name) {
  const re = new RegExp(`/\\*\\*([\\s\\S]*?)\\*/\\s*(?:export\\s+)?(?:default\\s+)?(?:function|const|let|var)\\s+${name}\\b`);
  return re.exec(text)?.[1] ?? null;
}

function paramDocs(block) {
  if (!block) return {};
  const docs = {};
  for (const m of block.matchAll(/@param\s+\{([^}]*)\}\s+\[?([A-Za-z_$][\w$.]*)\]?\s*(?:-\s*(.*))?/g)) {
    const [, type, rawName, desc] = m;
    const key = rawName.split('.')[0];
    if (!docs[key]) docs[key] = { type: type.trim(), desc: (desc ?? '').trim() };
  }
  return docs;
}

// ── fallback: infer from the prop NAME, using React's own conventions ────────
// Only fires when neither JSDoc nor a default value said anything, so it never
// overrides information that actually exists in the source.
function inferFromName(key) {
  if (key === 'children') return 'React.ReactNode';
  if (key === 'className') return 'string';
  if (/^on[A-Z]/.test(key)) return '(...args: any[]) => void';
  if (/^(is|has|should|show|hide|can)[A-Z]/.test(key)) return 'boolean';
  if (/^(disabled|loading|open|active|selected|compact|expanded|readOnly|required|checked)$/.test(key)) return 'boolean';
  if (/^(label|title|subtitle|placeholder|id|name|href|src|alt|unit|sport|variant|size|type|color|text)$/.test(key)) return 'string';
  if (/^(count|index|score|width|height|min|max|step|duration|rating)$/.test(key)) return 'number';
  if (/^(options|items|rows|columns|entries|slots|sessions|spots|days|data|list)$/.test(key)) return 'unknown[]';
  return null;
}

// Props that are optional regardless of having no default value: passing them
// is never necessary to get a correct render.
const ALWAYS_OPTIONAL = /^(className|icon|Icon|style|id|title|subtitle|placeholder|alt|unit|children|onClick)$/;

const isComponent = (n) => /^[A-Z][A-Za-z0-9]*$/.test(n);
const out = {};

for (const file of walk(SRC)) {
  const text = readFileSync(file, 'utf8');
  const names = [
    ...[...text.matchAll(/^export\s+(?:async\s+)?(?:function|const|class)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]),
    ...(() => {
      const d = /^export\s+default\s+(?:function\s+([A-Za-z_$][\w$]*)|([A-Za-z_$][\w$]*))/m.exec(text);
      return d ? [d[1] ?? d[2]] : [];
    })(),
  ].filter(isComponent);

  for (const name of names) {
    const block = paramBlock(text, name);
    if (block === null) continue;
    const docs = paramDocs(jsdocFor(text, name));
    const lines = [];
    let rest = false;

    for (const part of splitTop(block)) {
      if (part.startsWith('...')) { rest = true; continue; }
      // `key: alias = default` | `key = default` | `key`
      const eq = (() => {
        let depth = 0, q = null;
        for (let i = 0; i < part.length; i++) {
          const c = part[i];
          if (q) { if (c === q && part[i - 1] !== '\\') q = null; continue; }
          if (c === '"' || c === "'" || c === '`') { q = c; continue; }
          if ('{[('.includes(c)) depth++;
          if ('}])'.includes(c)) depth--;
          if (c === '=' && depth === 0 && part[i + 1] !== '=' && part[i - 1] !== '=') return i;
        }
        return -1;
      })();
      const lhs = (eq < 0 ? part : part.slice(0, eq)).trim();
      const def = eq < 0 ? null : part.slice(eq + 1).trim();
      const key = lhs.split(':')[0].trim();
      if (!/^[A-Za-z_$][\w$]*$/.test(key)) continue;

      // A prop holding "an icon" is either a component the body instantiates
      // (`icon: Icon` + `<Icon />`) or an already-rendered node (`{icon}`).
      // Decide from how the body actually uses the local binding.
      const alias = lhs.includes(':') ? lhs.split(':')[1].trim() : key;
      const usedAsElement = new RegExp(`<${alias}[\\s/>]`).test(text);
      const iconType = /icon/i.test(key) ? (usedAsElement ? 'React.ComponentType' : 'React.ReactNode') : null;

      // Recover a variant union from the component's own style lookup table
      // (`const variants = { primary: …, ghost: … }`) when nothing else typed it.
      const unionFromMap = (() => {
        if (!/^(variant|size|tone|level)$/.test(key)) return null;
        const m = new RegExp(`const\\s+(?:${key}s|${key}Styles|${key}Classes|${key}Map)\\s*=\\s*\\{`).exec(text);
        if (!m) return null;
        let depth = 0, start = text.indexOf('{', m.index);
        for (let j = start; j < text.length; j++) {
          if (text[j] === '{') depth++;
          else if (text[j] === '}') { depth--; if (depth === 0) { start = text.slice(start + 1, j); break; } }
        }
        if (typeof start !== 'string') return null;
        const keys = [...start.matchAll(/(?:^|,)\s*["']?([A-Za-z_$][\w$-]*)["']?\s*:/g)].map((x) => x[1]);
        return keys.length >= 2 ? keys.map((k) => `"${k}"`).join(' | ') : null;
      })();

      const doc = docs[key];
      const type =
        jsdocType(doc?.type) ?? iconType ?? unionFromMap ?? inferFromDefault(def) ?? inferFromName(key) ?? 'unknown';
      // Optional when it has a default, when its name makes it inherently
      // optional, or when the JSDoc description says so.
      const optional =
        def != null || ALWAYS_OPTIONAL.test(key) || /^optional\b/i.test(doc?.desc ?? '') ? '?' : '';
      const comment = doc?.desc ? ` /** ${doc.desc} */ ` : '';
      lines.push(`${comment}${key}${optional}: ${type};`);
    }

    if (!lines.length && !rest) continue;
    if (rest) lines.push('[key: string]: unknown;');
    out[name] = lines.join(' ');
  }
}

console.log(JSON.stringify({ dtsPropsFor: Object.fromEntries(Object.entries(out).sort()) }, null, 2));
console.error(`extracted props for ${Object.keys(out).length} components`);
