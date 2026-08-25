import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const auth = readFileSync(path.join(root, "convex/auth.ts"), "utf8");
const schema = readFileSync(path.join(root, "convex/schema.ts"), "utf8");

describe("auth expiry cleanup is indexed", () => {
  it("adds by_expiresAt on magic_links and sessions", () => {
    assert.match(schema, /magic_links:[\s\S]*by_expiresAt/);
    assert.match(schema, /sessions:[\s\S]*by_expiresAt/);
  });

  it("does not collect the whole magic_links or sessions table", () => {
    const expiredLinks = auth.slice(
      auth.indexOf("export const getExpiredMagicLinks"),
      auth.indexOf("export const getExpiredSessions")
    );
    const expiredSessions = auth.slice(
      auth.indexOf("export const getExpiredSessions"),
      auth.indexOf("export const deleteMagicLink")
    );
    assert.match(expiredLinks, /by_expiresAt/);
    assert.doesNotMatch(expiredLinks, /\.collect\(\)/);
    assert.match(expiredSessions, /by_expiresAt/);
    assert.doesNotMatch(expiredSessions, /\.collect\(\)/);
  });
});
