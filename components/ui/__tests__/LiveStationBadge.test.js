import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LiveStationBadge } from "../LiveStationBadge";

describe("LiveStationBadge", () => {
  it("shows the FROM label for raw Windguru degrees (matches forecast WindLine)", () => {
    // 337.5° ≈ NNW FROM (nortada). Must not print the inverted TO (SSE).
    render(
      <LiveStationBadge
        station={{
          speed: 11,
          gust: 19,
          direction: 337.5,
          directionLabel: "SSE", // deliberately wrong (TO) — must not win
          agoLabel: "1 MIN AGO",
        }}
      />
    );
    expect(screen.getByText("NNW")).toBeTruthy();
    expect(screen.queryByText("SSE")).toBeNull();
  });

  it("falls back to directionLabel when degrees are missing", () => {
    render(
      <LiveStationBadge
        station={{ speed: 11, directionLabel: "SSE", agoLabel: "1 MIN AGO" }}
      />
    );
    expect(screen.getByText("SSE")).toBeTruthy();
  });

  it("renders nothing without a finite speed", () => {
    const { container } = render(<LiveStationBadge station={{ direction: 90 }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
