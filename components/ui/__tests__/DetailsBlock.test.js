import { fireEvent, render, screen } from "@testing-library/react";
import { DetailsBlock } from "../DetailsBlock";

describe("DetailsBlock", () => {
  it("starts closed and opens on the summary click", () => {
    const { container } = render(
      <DetailsBlock title="The numbers" caption="Full table">
        <p>MAE table</p>
      </DetailsBlock>
    );
    const details = container.querySelector("details");
    expect(details.open).toBe(false);
    expect(screen.getByText("The numbers")).toBeTruthy();
    fireEvent.click(screen.getByText("The numbers"));
    expect(details.open).toBe(true);
  });
});
