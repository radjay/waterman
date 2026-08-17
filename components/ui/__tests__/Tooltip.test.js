import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Tooltip } from "../Tooltip";

describe("Tooltip wrapper position", () => {
  it("is relative by default so a static trigger can host the tip", () => {
    const { container } = render(
      <Tooltip content="Hint">
        <span>Go</span>
      </Tooltip>
    );
    const wrap = container.firstChild;
    expect(wrap.className.split(/\s+/)).toContain("relative");
    expect(wrap.className.split(/\s+/)).not.toContain("absolute");
  });

  it("does not add relative when the caller already positions it", () => {
    // ScoreBand columns are `absolute inset-y-0`. A stacked relative here
    // dropped them out of the plot.
    const { container } = render(
      <Tooltip content="Verdict" className="absolute inset-y-0 left-0">
        <button type="button">40</button>
      </Tooltip>
    );
    const wrap = container.firstChild;
    expect(wrap.className.split(/\s+/)).toContain("absolute");
    expect(wrap.className.split(/\s+/)).not.toContain("relative");
  });
});
