import { vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ScoreDial, scoreBand } from "../ScoreDial";

describe("scoreBand", () => {
  it("puts 60 and above in the accent band", () => {
    expect(scoreBand(100)).toBe("good");
    expect(scoreBand(75)).toBe("good");
    expect(scoreBand(60)).toBe("good");
  });

  it("puts 45-59 in the marginal band", () => {
    expect(scoreBand(59)).toBe("marginal");
    expect(scoreBand(45)).toBe("marginal");
  });

  it("puts below 45 in the low band, so a flat day reads near-empty", () => {
    expect(scoreBand(44)).toBe("low");
    expect(scoreBand(12)).toBe("low");
    expect(scoreBand(0)).toBe("low");
  });
});

describe("ScoreDial visibility", () => {
  it("hides scores under 60 by default", () => {
    const { container } = render(<ScoreDial score={41} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows scores under 60 when showAll is set", () => {
    render(<ScoreDial score={41} showAll />);
    expect(screen.getByText("41")).toBeTruthy();
  });

  it("shows 60 and above without showAll", () => {
    render(<ScoreDial score={92} />);
    expect(screen.getByText("92")).toBeTruthy();
  });

  it("renders nothing for a null or undefined score", () => {
    const { container: a } = render(<ScoreDial score={null} showAll />);
    const { container: b } = render(<ScoreDial score={undefined} showAll />);
    expect(a).toBeEmptyDOMElement();
    expect(b).toBeEmptyDOMElement();
  });

  it("renders a zero score when asked, rather than treating it as absent", () => {
    render(<ScoreDial score={0} showAll />);
    expect(screen.getByText("0")).toBeTruthy();
  });
});

describe("ScoreDial rendering", () => {
  it("clamps the gradient stop to 0-100 for out-of-range scores", () => {
    const { container } = render(<ScoreDial score={140} />);
    const ring = container.firstChild;
    expect(ring.style.background).toContain("100%");
    expect(ring.style.background).not.toContain("140%");
  });

  // jsdom's CSS parser drops `rgb(var(--x))`, so read the style attribute that
  // actually ships rather than the parsed CSSOM value.
  const styleAttr = (el) => el.getAttribute("style") || "";

  it("uses an opaque inner disc, or the ring shows through", () => {
    // Regression: bg-surface is rgba(...,.05) and let the conic-gradient
    // through, so the dial read as a pie chart on tinted cards.
    const { container } = render(<ScoreDial score={84} on="card" />);
    const disc = container.querySelector("[data-dial-disc]");
    expect(styleAttr(disc)).toContain("var(--wm-dial-inner-card)");
  });

  it("uses the page colour for the inner disc by default", () => {
    const { container } = render(<ScoreDial score={84} />);
    const disc = container.querySelector("[data-dial-disc]");
    expect(styleAttr(disc)).toContain("rgb(var(--wm-page))");
    expect(styleAttr(disc)).not.toContain("dial-inner-card");
  });

  it("never renders a real <button>, because it sits inside one", () => {
    // Regression: ScoreCard is a <button> when clickable, so a nested <button>
    // here is invalid HTML — React fails hydration and regenerates the tree.
    const { container: plain } = render(<ScoreDial score={92} />);
    const { container: clickable } = render(<ScoreDial score={92} onClick={() => {}} />);
    expect(plain.querySelector("button")).toBeNull();
    expect(clickable.querySelector("button")).toBeNull();
  });

  it("is still keyboard reachable and labelled when clickable", () => {
    const onClick = vi.fn();
    const { container } = render(<ScoreDial score={92} onClick={onClick} />);
    const el = container.firstChild;
    expect(el.getAttribute("role")).toBe("button");
    expect(el.getAttribute("tabindex")).toBe("0");
    expect(el.getAttribute("aria-label")).toBe("Score 92");
    fireEvent.keyDown(el, { key: "Enter" });
    expect(onClick).toHaveBeenCalled();
  });

  it("exposes no button semantics when not clickable", () => {
    const { container } = render(<ScoreDial score={92} />);
    expect(container.firstChild.getAttribute("role")).toBeNull();
    expect(container.firstChild.getAttribute("tabindex")).toBeNull();
  });

  it("rounds fractional scores for display", () => {
    render(<ScoreDial score={84.6} />);
    expect(screen.getByText("85")).toBeTruthy();
  });
});
