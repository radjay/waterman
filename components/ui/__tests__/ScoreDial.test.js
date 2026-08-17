import { vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ScoreDial, ScoreDialEmpty, scoreBand } from "../ScoreDial";

describe("scoreBand", () => {
  it("splits the accent range into three, matching the score bars", () => {
    expect(scoreBand(100)).toBe("epic");
    expect(scoreBand(86)).toBe("epic");
    expect(scoreBand(85)).toBe("great");
    expect(scoreBand(75)).toBe("great");
    expect(scoreBand(74)).toBe("good");
    expect(scoreBand(60)).toBe("good");
  });

  it("puts everything below the bar in the marginal band", () => {
    expect(scoreBand(59)).toBe("marginal");
    expect(scoreBand(12)).toBe("marginal");
    expect(scoreBand(0)).toBe("marginal");
  });

  it("has no band for a missing score — that is the placeholder's job", () => {
    expect(scoreBand(null)).toBeNull();
    expect(scoreBand(undefined)).toBeNull();
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

  it("renders nothing for a missing score unless the caller wants the placeholder", () => {
    const { container: a } = render(<ScoreDial score={null} />);
    const { container: b } = render(<ScoreDial score={undefined} />);
    expect(a).toBeEmptyDOMElement();
    expect(b).toBeEmptyDOMElement();
  });

  it("draws the dashed placeholder for a missing score when showAll is set", () => {
    // "We have nothing for you here" is an answer; a gap in a column of dials
    // reads as a rendering failure, and a 0 would read as "terrible".
    const { container } = render(<ScoreDial score={null} showAll />);
    expect(screen.getByText("—")).toBeTruthy();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders a zero score when asked, rather than treating it as absent", () => {
    render(<ScoreDial score={0} showAll />);
    expect(screen.getByText("0")).toBeTruthy();
  });
});

describe("ScoreDial rendering", () => {
  const valueArc = (container) => container.querySelectorAll("circle")[1];

  it("draws the value as an arc of the 276.46 circumference", () => {
    const { container } = render(<ScoreDial score={50} showAll />);
    expect(valueArc(container).getAttribute("stroke-dasharray")).toBe("138.2 276.46");
  });

  it("clamps the arc to the full circle for out-of-range scores", () => {
    const { container } = render(<ScoreDial score={140} />);
    expect(valueArc(container).getAttribute("stroke-dasharray")).toBe("276.5 276.46");
  });

  it("needs no opaque inner disc — the ring is a stroke, not a wedge", () => {
    // Regression: the conic-gradient version had to punch a disc in the middle,
    // and that disc had to know what colour the card behind it was.
    const { container } = render(<ScoreDial score={84} />);
    expect(container.querySelector("[data-dial-disc]")).toBeNull();
    expect(container.innerHTML).not.toContain("dial-inner-card");
  });

  it("paints the ring by verdict band: dim / caution / accent", () => {
    const { container: low } = render(<ScoreDial score={0} showAll />);
    const { container: maybe } = render(<ScoreDial score={60} />);
    const { container: go } = render(<ScoreDial score={80} />);
    // A zero has no value arc (round cap would fake a tiny score). The number
    // still uses dim — orange is reserved for MAYBE.
    expect(screen.getByText("0").className).toContain("text-dim");
    expect(valueArc(maybe).getAttribute("stroke")).toContain("--wm-caution");
    expect(valueArc(go).getAttribute("stroke")).toContain("--wm-accent");
    const { container: lowRing } = render(<ScoreDial score={41} showAll />);
    expect(valueArc(lowRing).getAttribute("stroke")).toContain("--wm-dim");
  });

  it("never renders a real <button>, because it sits inside one", () => {
    // Regression: rows are <button> when clickable, so a nested <button> here is
    // invalid HTML — React fails hydration and regenerates the tree.
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

  it("is an image, not a control, when it is not clickable", () => {
    const { container } = render(<ScoreDial score={92} />);
    expect(container.firstChild.getAttribute("role")).toBe("img");
    expect(container.firstChild.getAttribute("tabindex")).toBeNull();
  });

  it("accepts the legacy t-shirt sizes as well as pixels", () => {
    const { container: named } = render(<ScoreDial score={92} size="md" />);
    const { container: px } = render(<ScoreDial score={92} size={52} />);
    expect(named.firstChild.getAttribute("style")).toBe(px.firstChild.getAttribute("style"));
  });

  it("rounds fractional scores for display", () => {
    render(<ScoreDial score={84.6} />);
    expect(screen.getByText("85")).toBeTruthy();
  });
});

describe("ScoreDialEmpty", () => {
  it("is labelled so the dash is not read as decoration", () => {
    render(<ScoreDialEmpty />);
    expect(screen.getByLabelText("No score")).toBeTruthy();
  });
});
