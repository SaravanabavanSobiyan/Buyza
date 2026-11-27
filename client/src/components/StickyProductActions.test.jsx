import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StickyProductActions from "./StickyProductActions";

let intersectionCallback;
const originalObserver = globalThis.IntersectionObserver;

class MockIntersectionObserver {
  constructor(callback) {
    intersectionCallback = callback;
  }

  observe() {}
  disconnect() {}
}

function renderActions(props = {}) {
  function Harness() {
    const targetRef = useRef(null);
    return (
      <>
        <div ref={targetRef}>Product actions</div>
        <StickyProductActions targetRef={targetRef} price={1500} {...props}>
          <button type="button" data-testid="add-action" data-variant={props.variantSku} data-quantity={props.quantity}>
            Add to cart
          </button>
        </StickyProductActions>
      </>
    );
  }

  return render(<Harness />);
}

const setVisible = (isIntersecting) =>
  act(() => intersectionCallback([{ isIntersecting }]));

beforeEach(() => {
  Object.defineProperty(globalThis, "IntersectionObserver", {
    configurable: true,
    value: MockIntersectionObserver,
  });
});

afterEach(() => {
  if (originalObserver === undefined) delete globalThis.IntersectionObserver;
  else Object.defineProperty(globalThis, "IntersectionObserver", { configurable: true, value: originalObserver });
});

describe("StickyProductActions", () => {
  it("appears only after the product actions scroll out of view", () => {
    renderActions();
    expect(screen.queryByRole("button", { name: "Add to cart" })).not.toBeInTheDocument();

    setVisible(true);
    expect(screen.queryByRole("button", { name: "Add to cart" })).not.toBeInTheDocument();
    setVisible(false);
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeInTheDocument();
    expect(screen.getByText(/LKR.15\.00/)).toBeInTheDocument();

    setVisible(true);
    expect(screen.queryByRole("button", { name: "Add to cart" })).not.toBeInTheDocument();
  });

  it("passes the selected variant and quantity to the action", () => {
    renderActions({ variantSku: "RED-M", quantity: 3 });
    setVisible(false);

    expect(screen.getByTestId("add-action")).toHaveAttribute("data-variant", "RED-M");
    expect(screen.getByTestId("add-action")).toHaveAttribute("data-quantity", "3");
  });

  it("offers a choose-options action when a variant is required", () => {
    const onChooseOption = vi.fn();
    renderActions({ needsChoice: true, priceFrom: true, onChooseOption });
    setVisible(false);

    expect(screen.getByText("From")).toBeInTheDocument();
    expect(screen.queryByTestId("add-action")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Choose options" }));
    expect(onChooseOption).toHaveBeenCalledOnce();
  });

  it("keeps the sticky actions available when IntersectionObserver is unsupported", () => {
    delete globalThis.IntersectionObserver;
    renderActions();
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeInTheDocument();
  });
});
