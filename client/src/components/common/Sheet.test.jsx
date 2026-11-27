import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Sheet from "./Sheet";

describe("Sheet", () => {
  it("locks body scroll, traps keyboard focus, closes on Escape, and restores focus", () => {
    const onClose = vi.fn();
    const sheet = (open) => (
      <>
        <button type="button">Open sheet</button>
        <Sheet open={open} onClose={onClose} title="Filters">
          <button type="button">First action</button>
          <button type="button">Last action</button>
        </Sheet>
      </>
    );
    const { rerender } = render(sheet(false));

    const opener = screen.getByRole("button", { name: "Open sheet" });
    opener.focus();
    rerender(sheet(true));
    const dialog = screen.getByRole("dialog", { name: "Filters" });
    const first = screen.getAllByRole("button", { name: "Close dialog" })[1];
    const last = screen.getByRole("button", { name: "Last action" });

    expect(document.body.style.overflow).toBe("hidden");
    expect(dialog).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    rerender(sheet(false));
    expect(document.body.style.overflow).toBe("");
    expect(opener).toHaveFocus();
  });

  it("closes when the backdrop is tapped", () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} title="Cart">
        <p>Cart contents</p>
      </Sheet>
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Close dialog" })[0]);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
