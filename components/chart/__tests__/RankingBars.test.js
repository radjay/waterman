import { render, screen } from "@testing-library/react";
import { RankingBars } from "../RankingBars";

describe("RankingBars", () => {
  it("labels the lowest MAE as best", () => {
    render(
      <RankingBars
        title="Typical miss"
        winnerKey="icon-eu"
        rows={[
          { model: "icon-eu", label: "ICON7", mae: 2.1 },
          { model: "gfs-global", label: "GFS", mae: 3.4 },
        ]}
      />
    );
    expect(screen.getByText(/ICON7/)).toBeTruthy();
    expect(screen.getByText(/best/)).toBeTruthy();
    expect(screen.getByText("2.10 kt")).toBeTruthy();
  });
});
