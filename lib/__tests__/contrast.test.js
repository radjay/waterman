import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Contrast guard for the two themes.
 *
 * The mono labels are the treatment most at risk: 9-11px uppercase at .16em-.22em
 * tracking. They are the reason Dayglass drops the accent from #6EE7F0 to
 * #0E7A85 — cyan on white is about 1.3:1. This test pins that reasoning down so
 * a future palette tweak cannot quietly undo it.
 *
 * Values are parsed from app/theme.css rather than duplicated here, so the test
 * fails when the real tokens change.
 */
const css = readFileSync(path.join(process.cwd(), "app/theme.css"), "utf8");

function blockFor(selector) {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`theme.css missing ${selector}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  return css.slice(open, close);
}

function token(block, name) {
  const match = block.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`missing token ${name}`);
  return match[1].trim();
}

/** Accepts "10 20 32", "#0A1420" or "rgba(r,g,b,a)". Composites alpha over `over`. */
function toRgb(value, over = [0, 0, 0]) {
  if (/^\d+\s+\d+\s+\d+$/.test(value)) return value.split(/\s+/).map(Number);

  if (value.startsWith("#")) {
    const hex = value.slice(1);
    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  }

  const rgba = value.match(/rgba?\(([^)]+)\)/);
  if (rgba) {
    const parts = rgba[1].split(",").map((p) => parseFloat(p.trim()));
    const [r, g, b, a = 1] = parts;
    return [r, g, b].map((c, i) => Math.round(c * a + over[i] * (1 - a)));
  }
  throw new Error(`cannot parse colour: ${value}`);
}

const luminance = ([r, g, b]) => {
  const chan = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
};

/** Hue angle in degrees, 0-360. */
const hue = ([r, g, b]) => {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;
  if (d === 0) return 0;
  let h;
  if (max === R) h = ((G - B) / d) % 6;
  else if (max === G) h = (B - R) / d + 2;
  else h = (R - G) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
};

/** Shortest angular distance between two hues, 0-180. */
const hueDistance = (a, b) => {
  const diff = Math.abs(hue(a) - hue(b)) % 360;
  return diff > 180 ? 360 - diff : diff;
};

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const THEMES = {
  Nightglass: blockFor(':root[data-theme="night"]'),
  Dayglass: blockFor(':root[data-theme="day"]'),
};

describe.each(Object.entries(THEMES))("%s contrast", (name, block) => {
  const page = toRgb(token(block, "--wm-page"));
  const surface = toRgb(token(block, "--wm-surface"), page);

  // 4.5:1 is the WCAG AA threshold for normal text. The mono labels are small
  // and letter-spaced, so they get held to it rather than the large-text 3:1.
  it.each([
    ["primary text on page", "--wm-ink", 4.5],
    ["muted text on page", "--wm-muted", 4.5],
    ["accent on page", "--wm-accent", 4.5],
  ])("%s clears %s:1", (_label, tokenName, min) => {
    expect(contrast(toRgb(token(block, tokenName), page), page)).toBeGreaterThanOrEqual(min);
  });

  it("dim text clears 3:1 — it is decorative, never the only carrier of meaning", () => {
    expect(contrast(toRgb(token(block, "--wm-dim"), page), page)).toBeGreaterThanOrEqual(3);
  });

  it("accent still reads on a card surface, not just the page", () => {
    const accent = toRgb(token(block, "--wm-accent"), surface);
    expect(contrast(accent, surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("the filled sport pill's own text/background pair clears 4.5:1", () => {
    // This pairing is the one component that broke when both themes shared the
    // accent-on-tint treatment, which is why it has its own token pair.
    const bg = toRgb(token(block, "--wm-sport-pill-bg"), page);
    const fg = toRgb(token(block, "--wm-sport-pill-text"), bg);
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("primary-button text reads on the accent fill", () => {
    // Button variant="primary" is bg-accent with text-page.
    const accent = toRgb(token(block, "--wm-accent"), page);
    expect(contrast(page, accent)).toBeGreaterThanOrEqual(4.5);
  });

  it("the marginal colour is separated from the accent by hue", () => {
    const accent = toRgb(token(block, "--wm-accent"), page);
    const marginal = toRgb(token(block, "--wm-marginal"), page);

    // Deliberately hue, not luminance. In Dayglass these two sit at almost
    // identical luminance (about 1.02:1) and are told apart purely by hue —
    // teal against magenta. That is fine here because they differ on the
    // blue/yellow axis as well as red/green, so red-green colour blindness
    // still separates them, AND because nothing in the UI relies on colour
    // alone to carry the good/marginal distinction: the score dial always
    // prints the number inside the ring.
    //
    // Anything added later that encodes this distinction by fill alone — the
    // week strip's bands, for instance — needs a non-colour carrier too, which
    // is why that design specifies a legend.
    expect(hueDistance(accent, marginal)).toBeGreaterThan(60);
  });
});

describe("theme relationship", () => {
  it("does not derive one theme from the other by inversion", () => {
    // The accent is the same hue at a very different lightness, chosen for
    // contrast on white. If someone ever 'simplifies' this to an inversion,
    // Dayglass accent lands near 1.3:1 and the mono labels disappear.
    const night = toRgb(token(THEMES.Nightglass, "--wm-accent"));
    const day = toRgb(token(THEMES.Dayglass, "--wm-accent"));
    const inverted = night.map((c) => 255 - c);
    const distance = Math.hypot(...day.map((c, i) => c - inverted[i]));
    expect(distance).toBeGreaterThan(40);
  });

  it("keeps both dial inner-disc tokens fully opaque", () => {
    // A translucent disc lets the conic-gradient ring through and the dial
    // reads as a pie chart.
    for (const block of Object.values(THEMES)) {
      expect(token(block, "--wm-dial-inner-card")).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("the NOW marker", () => {
  it("uses text that actually reads on the orange, in both themes", () => {
    // White on the Nightglass orange is 2.07:1 — it fails AA outright. This is
    // the reason the pill uses near-black rather than the white you would
    // reach for on a warm fill.
    for (const [name, block] of Object.entries(THEMES)) {
      const bg = toRgb(token(block, "--wm-now"));
      const fg = toRgb(token(block, "--wm-now-text"), bg);
      expect(contrast(fg, bg), `${name} NOW pill`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("is a hue of its own, not a reuse of accent or marginal", () => {
    // "You are here" is a position, not a judgement — sharing a colour with the
    // score semantics would make the strip say two things with one signal.
    for (const block of Object.values(THEMES)) {
      const now = toRgb(token(block, "--wm-now"));
      expect(hueDistance(now, toRgb(token(block, "--wm-accent")))).toBeGreaterThan(60);
      expect(hueDistance(now, toRgb(token(block, "--wm-marginal")))).toBeGreaterThan(30);
    }
  });
});

describe("the NOW rule against the page", () => {
  it("stays visible as a graphic element in both themes", () => {
    // 3:1 is the WCAG threshold for non-text. The day orange is a balance:
    // light enough that near-black text on the pill reads, dark enough that
    // the rule still shows against a near-white page.
    for (const [name, block] of Object.entries(THEMES)) {
      const page = toRgb(token(block, "--wm-page"));
      const now = toRgb(token(block, "--wm-now"), page);
      expect(contrast(now, page), `${name} NOW rule`).toBeGreaterThanOrEqual(3);
    }
  });
});
