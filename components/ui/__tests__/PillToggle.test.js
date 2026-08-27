import { fireEvent, render, screen } from "@testing-library/react";
import { PillToggle } from "../PillToggle";

describe("PillToggle", () => {
  it("calls onChange without following a link", () => {
    const onChange = vi.fn();
    render(
      <PillToggle
        name="lead"
        value="1"
        animated={false}
        onChange={onChange}
        options={[
          { id: "0", label: "Same day", href: "?lead=0#picks" },
          { id: "1", label: "Yesterday", href: "?lead=1#picks" },
        ]}
      />
    );
    const pill = screen.getByRole("link", { name: "Same day" });
    expect(pill.tagName).toBe("A");
    fireEvent.click(pill);
    expect(onChange).toHaveBeenCalledWith("0");
  });
});
