import { render, screen } from "@testing-library/react";
import { SkillTable } from "../SkillTable";

describe("SkillTable", () => {
  it("marks the winner and prints how far off in knots", () => {
    render(
      <SkillTable
        caption="Same hours for every model."
        winnerModel="icon-eu"
        rows={[
          {
            model: "icon-eu",
            label: "ICON7",
            hours: 12,
            mae: 2.1,
            speedMae: 2.0,
            gustMae: 2.4,
            bias: -0.4,
          },
        ]}
      />
    );
    expect(screen.getByText("ICON7")).toBeTruthy();
    expect(screen.getByText("Winner")).toBeTruthy();
    expect(screen.getByText("Overall, kt off")).toBeTruthy();
    expect(screen.getByText("2.1")).toBeTruthy();
    expect(screen.getByText("Same hours for every model.")).toBeTruthy();
  });

  it("badges a synthetic row as a Rule, not a real model", () => {
    render(
      <SkillTable
        rows={[{ model: "router-consensus", label: "Router (direction)", synthetic: true, hours: 100 }]}
        columns={[{ key: "hours", label: "Hours" }]}
      />
    );
    expect(screen.getByText("Rule")).toBeInTheDocument();
  });
});
