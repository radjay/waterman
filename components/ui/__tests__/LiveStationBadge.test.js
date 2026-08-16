import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LiveStationBadge } from "../LiveStationBadge";

describe("LiveStationBadge", () => {
  it("shows the TO direction from raw FROM degrees (never unflipped FROM)", () => {
    // 337° ≈ NNW FROM → TO is SSE. Preferring raw degrees over a stale label
    // is what stops the cam badge disagreeing with the rest of the app.
    render(
      <LiveStationBadge
        station={{
          speed: 11,
          gust: 19,
          direction: 337.5,
          directionLabel: "NNW", // deliberately wrong (FROM) — must not win
          agoLabel: "1 MIN AGO",
        }}
      />
    );
    expect(screen.getByText("SSE")).toBeTruthy();
    expect(screen.queryByText("NNW")).toBeNull();
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
