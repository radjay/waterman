import { toSpotSlug, spotFromSlug } from "../spotSlug";

describe("toSpotSlug", () => {
  it("lowercases a simple name", () => {
    expect(toSpotSlug("Carcavelos")).toBe("carcavelos");
  });

  it("replaces spaces with hyphens", () => {
    expect(toSpotSlug("Costa do Estoril")).toBe("costa-do-estoril");
  });

  it("strips accents via NFD normalization", () => {
    expect(toSpotSlug("Nazaré")).toBe("nazare");
  });

  // Documents CURRENT behaviour, which is not the conventional slug rule.
  // An apostrophe becomes a hyphen rather than being stripped, so
  // "Praia D'El Rey" -> "praia-d-el-rey" instead of "praia-del-rey".
  //
  // Deliberately NOT fixed here. toSpotSlug generates the shareable
  // /report/[spot] deep-link URLs, so changing it silently breaks any link
  // already shared for a spot whose name contains an apostrophe. That is a URL
  // compatibility decision with a possible redirect requirement, not a tidy-up
  // to fold into a theme change. See the Phase 1 PR description.
  it("turns apostrophes into hyphens (known deviation from the usual rule)", () => {
    expect(toSpotSlug("Praia D'El Rey")).toBe("praia-d-el-rey");
  });

  it("collapses leading/trailing whitespace", () => {
    expect(toSpotSlug("  Spot Name  ")).toBe("spot-name");
  });

  it("returns empty string for empty input", () => {
    expect(toSpotSlug("")).toBe("");
  });

  it("returns empty string for null input", () => {
    expect(toSpotSlug(null)).toBe("");
  });

  it("returns empty string for undefined input", () => {
    expect(toSpotSlug(undefined)).toBe("");
  });

  it("collapses multiple spaces to a single hyphen", () => {
    expect(toSpotSlug("Costa  Nova")).toBe("costa-nova");
  });
});

describe("spotFromSlug", () => {
  const spots = [
    { _id: "1", name: "Carcavelos" },
    { _id: "2", name: "Costa do Estoril" },
    { _id: "3", name: "Nazaré" },
  ];

  it("returns the matching spot", () => {
    expect(spotFromSlug(spots, "carcavelos")).toEqual({ _id: "1", name: "Carcavelos" });
  });

  it("matches accented names via slug", () => {
    expect(spotFromSlug(spots, "nazare")).toEqual({ _id: "3", name: "Nazaré" });
  });

  it("returns null when no spot matches", () => {
    expect(spotFromSlug(spots, "nonexistent")).toBeNull();
  });

  it("returns null for an empty spots array", () => {
    expect(spotFromSlug([], "carcavelos")).toBeNull();
  });

  it("returns null for a null spots array", () => {
    expect(spotFromSlug(null, "carcavelos")).toBeNull();
  });

  it("returns null for an empty slug", () => {
    expect(spotFromSlug(spots, "")).toBeNull();
  });
});
