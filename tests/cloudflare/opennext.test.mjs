import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { CHANGELOG_MARKDOWN } from "../../lib/changelogContent.js";
import { loadBayWindMlModel } from "../../lib/forecast-experiment/loadBayWindMlModel.js";
import { DEFAULT_BAY_WIND_ML_MODEL } from "../../lib/forecast-experiment/bayWindMlModelDefaults.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

describe("OpenNext Worker hosting", () => {
  it("enables nodejs_compat and does not merge the email worker", () => {
    const wrangler = read("wrangler.jsonc");
    assert.match(wrangler, /"name": "waterman-web"/);
    assert.match(wrangler, /nodejs_compat/);
    assert.match(wrangler, /\.open-next\/worker\.js/);
    assert.doesNotMatch(wrangler, /waterman-email/);
    assert.match(wrangler, /WORKER_SELF_REFERENCE/);
  });

  it("bundles the changelog instead of reading disk at request time", () => {
    const page = read("app/changelog/page.js");
    assert.match(page, /CHANGELOG_MARKDOWN/);
    assert.doesNotMatch(page, /process\.cwd/);
    assert.equal(CHANGELOG_MARKDOWN, read("CHANGELOG.md"));
  });

  it("loads the trained bay-wind model, not the tiny default fixture", () => {
    const model = loadBayWindMlModel();
    assert.notEqual(model.kickInRegressor?.tree_info?.length, 1);
    assert.notEqual(model, DEFAULT_BAY_WIND_ML_MODEL);
  });

  it("keeps puppeteer out of production dependencies and skips Chrome postinstall", () => {
    const pkg = JSON.parse(read("package.json"));
    assert.equal(pkg.dependencies.puppeteer, undefined);
    assert.ok(pkg.devDependencies.puppeteer);
    assert.equal(pkg.scripts.postinstall, undefined);
    assert.match(pkg.scripts.preview, /opennextjs-cloudflare/);
    assert.match(pkg.scripts.deploy, /opennextjs-cloudflare/);
  });

  it("serves watermanreport.com from the Worker, not Render", () => {
    const wrangler = read("wrangler.jsonc");
    // Zone routes, not custom_domain: the apex still has Cloudflare DNS
    // records that point at the old origin. A Worker route intercepts
    // proxied traffic without deleting those records first.
    assert.match(wrangler, /zone_name/);
    assert.match(wrangler, /watermanreport\.com\/\*/);
    assert.match(wrangler, /www\.watermanreport\.com\/\*/);
    assert.doesNotMatch(wrangler, /custom_domain/);
  });
});

describe("Render retired", () => {
  it("removes the Render blueprint and setup guide", () => {
    assert.equal(existsSync(path.join(root, "render.yaml")), false);
    assert.equal(existsSync(path.join(root, "RENDER_SETUP.md")), false);
  });

  it("tells operators to deploy on Cloudflare and Convex, not Render", () => {
    const sop = read("SOP.md");
    const readme = read("README.md");
    const auth = read("AUTH_SETUP.md");
    assert.match(sop, /opennextjs-cloudflare deploy|npm run deploy/);
    assert.match(sop, /convex dev --once/);
    assert.doesNotMatch(sop, /dashboard\.render\.com/);
    assert.match(readme, /Cloudflare Workers/);
    assert.doesNotMatch(readme, /RENDER_SETUP/);
    assert.doesNotMatch(auth, /Render\.com/);
  });
});
