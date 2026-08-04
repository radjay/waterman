import { vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ALL_SPOTS, FAVORITES, SpotPicker } from "../SpotPicker";

const spots = [
  { _id: "a", name: "Praia do Guincho" },
  { _id: "b", name: "Lagoa da Albufeira" },
];

const setup = (props = {}) =>
  render(
    <SpotPicker
      spots={spots}
      value={FAVORITES}
      onChange={() => {}}
      hasFavorites={false}
      {...props}
    />
  );

describe("label", () => {
  it("says My favorites when the rider has some", () => {
    setup({ hasFavorites: true });
    expect(screen.getByRole("button").textContent).toContain("My favorites");
  });

  it("prompts instead when the default scope has nothing to scope to", () => {
    // Showing "My favorites" over a set the rider has never chosen would be a
    // label for something that does not exist.
    setup({ hasFavorites: false });
    expect(screen.getByRole("button").textContent).toContain("Select a spot");
  });

  it("names the spot once one is chosen", () => {
    setup({ value: "a", hasFavorites: true });
    expect(screen.getByRole("button").textContent).toContain("Praia do Guincho");
  });

  it("falls back to All spots for an unknown stored id", () => {
    // A spot can be removed, renamed, or stop supporting the selected sport.
    setup({ value: "gone", hasFavorites: true });
    expect(screen.getByRole("button").textContent).toContain("All spots");
  });
});

describe("options", () => {
  const open = (props) => {
    setup(props);
    fireEvent.click(screen.getByRole("button"));
    return screen.getAllByRole("option").map((o) => o.textContent.trim());
  };

  it("offers favourites first when there are any", () => {
    expect(open({ hasFavorites: true })[0]).toBe("My favorites");
  });

  it("omits the favourites option entirely when there are none", () => {
    const options = open({ hasFavorites: false });
    expect(options).not.toContain("My favorites");
    expect(options[0]).toBe("All spots");
  });

  it("lists every spot after the scopes", () => {
    expect(open({ hasFavorites: true })).toEqual([
      "My favorites",
      "All spots",
      "Praia do Guincho",
      "Lagoa da Albufeira",
    ]);
  });

  it("marks the active option for assistive tech, not just visually", () => {
    setup({ value: "a", hasFavorites: true });
    fireEvent.click(screen.getByRole("button"));
    const selected = screen.getAllByRole("option").filter((o) => o.getAttribute("aria-selected") === "true");
    expect(selected).toHaveLength(1);
    expect(selected[0].textContent).toContain("Praia do Guincho");
  });
});

describe("interaction", () => {
  it("reports the chosen scope and closes", () => {
    const onChange = vi.fn();
    setup({ onChange, hasFavorites: true });
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Lagoa da Albufeira"));
    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("can return to the all-spots scope", () => {
    const onChange = vi.fn();
    setup({ value: "a", onChange, hasFavorites: true });
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("All spots"));
    expect(onChange).toHaveBeenCalledWith(ALL_SPOTS);
  });

  it("exposes the scope in the accessible name, since the label alone is ambiguous", () => {
    setup({ hasFavorites: true });
    expect(screen.getByRole("button").getAttribute("aria-label")).toBe("Scope: My favorites");
  });
});
