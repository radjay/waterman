import { render, screen } from "@testing-library/react";
import { SampleDayWind } from "../SampleDayWind";

describe("SampleDayWind", () => {
  it("uses forecast columns and live lines, with a knots axis", () => {
    const { container } = render(
      <SampleDayWind
        modelKey="icon-eu"
        modelLabel="ICON7"
        hours={[
          {
            hourLocal: 10,
            observedSpeed: 12,
            observedGust: 18,
            models: { "icon-eu": { speed: 11, gust: 16 } },
          },
          {
            hourLocal: 13,
            observedSpeed: 16,
            observedGust: 24,
            models: { "icon-eu": { speed: 15, gust: 22 } },
          },
        ]}
      />
    );
    expect(screen.getByText("knots")).toBeTruthy();
    expect(screen.getByText(/Forecast column/)).toBeTruthy();
    expect(screen.getByText(/Live base/)).toBeTruthy();
    expect(container.querySelectorAll("rect").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("path").length).toBeGreaterThan(0);
  });
});
