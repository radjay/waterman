/**
 * Capture every route in both themes at both widths.
 *
 * Four images per route (night/day x mobile/desktop) is the grid that catches
 * token bugs — a colour that only breaks in Dayglass, or a layout that only
 * breaks at width. That is a lot of images, which is why this is scripted
 * rather than done by hand.
 *
 *   node scripts/screenshot.mjs [--out DIR] [--base URL] [--routes a,b,c]
 */
import puppeteer from "puppeteer";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const BASE = arg("base", "http://127.0.0.1:3010");
const OUT = arg("out", "./screenshots");

const DEFAULT_ROUTES = [
  "/ui-kit",
  "/dashboard",
  "/report",
  "/wing/best",
  "/wing/all",
  "/cams",
  "/calendar",
  "/journal",
  "/settings",
  "/profile",
  "/subscribe",
  "/request-spot",
  "/changelog",
  "/auth/login",
];

const routes = arg("routes", "").trim()
  ? arg("routes", "").split(",").map((r) => r.trim())
  : DEFAULT_ROUTES;

// deviceScaleFactor stays at 1. Chrome's full-page capture stitches bands and
// breaks past roughly 16384px, silently repeating content rather than failing —
// and /ui-kit is ~9400 CSS px tall, which a 2x scale factor pushes over the
// limit. 1x keeps every page under it.
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, isMobile: true, deviceScaleFactor: 1 },
  { name: "desktop", width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 },
];

const THEMES = ["night", "day"];

const slug = (route) => (route === "/" ? "root" : route.replace(/^\//, "").replace(/\//g, "-"));

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

let captured = 0;
const failures = [];

try {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      const dir = path.join(OUT, `${theme}-${viewport.name}`);
      await mkdir(dir, { recursive: true });

      const page = await browser.newPage();
      await page.setViewport(viewport);

      for (const route of routes) {
        const url = `${BASE}${route}${route.includes("?") ? "&" : "?"}theme=${theme}`;
        try {
          const response = await page.goto(url, {
            waitUntil: "networkidle2",
            timeout: 45000,
          });
          // Let fonts settle so type is never captured mid-swap.
          await page.evaluate(() => document.fonts.ready);
          await new Promise((r) => setTimeout(r, 350));

          const applied = await page.evaluate(() =>
            document.documentElement.getAttribute("data-theme")
          );
          if (applied !== theme) {
            failures.push(`${route} [${theme}/${viewport.name}]: data-theme=${applied}`);
          }

          await page.screenshot({
            path: path.join(dir, `${slug(route)}.png`),
            fullPage: true,
          });
          captured++;
          const status = response ? response.status() : "?";
          console.log(`  ${theme}/${viewport.name} ${route} -> ${status}`);
        } catch (error) {
          failures.push(`${route} [${theme}/${viewport.name}]: ${error.message}`);
          console.log(`  ${theme}/${viewport.name} ${route} -> FAILED: ${error.message}`);
        }
      }
      await page.close();
    }
  }
} finally {
  await browser.close();
}

console.log(`\nCaptured ${captured} screenshots into ${OUT}`);
if (failures.length) {
  console.log(`\n${failures.length} problem(s):`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exitCode = 1;
}
