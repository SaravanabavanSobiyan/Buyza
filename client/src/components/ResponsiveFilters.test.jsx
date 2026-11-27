import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ResponsiveFilters from "./ResponsiveFilters";

const BREAKPOINT = "(min-width: 1024px)";

function mockMatchMedia(initialMatches) {
  const listeners = new Set();
  const media = {
    matches: initialMatches,
    media: BREAKPOINT,
    addEventListener: (_event, listener) => listeners.add(listener),
    removeEventListener: (_event, listener) => listeners.delete(listener),
  };
  vi.spyOn(window, "matchMedia").mockReturnValue(media);
  return {
    set(matches) {
      media.matches = matches;
      act(() => listeners.forEach((listener) => listener({ matches })));
    },
  };
}

const content = ({ mobile }) => <p>{mobile ? "Mobile controls" : "Desktop controls"}</p>;

afterEach(() => vi.restoreAllMocks());

describe("ResponsiveFilters", () => {
  it("renders a desktop sidebar without a filter button", () => {
    mockMatchMedia(true);
    render(<ResponsiveFilters activeFilterCount={2}>{content}</ResponsiveFilters>);

    expect(screen.getByRole("complementary", { name: "Product filters" })).toHaveTextContent("Desktop controls");
    expect(screen.queryByRole("button", { name: /Filters/ })).not.toBeInTheDocument();
  });

  it("opens the mobile sheet, reports active filters, and closes with Escape", () => {
    mockMatchMedia(false);
    render(<ResponsiveFilters activeFilterCount={3}>{content}</ResponsiveFilters>);

    fireEvent.click(screen.getByRole("button", { name: "Filters (3)" }));
    expect(screen.getByRole("dialog", { name: "Filters" })).toHaveTextContent("Mobile controls");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("shows the result count and does not reopen after resizing back to mobile", () => {
    const media = mockMatchMedia(false);
    render(
      <ResponsiveFilters activeFilterCount={0} resultCount={1}>
        {content}
      </ResponsiveFilters>
    );

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByRole("button", { name: "Show 1 result" })).toBeInTheDocument();
    media.set(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Product filters" })).toBeInTheDocument();

    media.set(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
