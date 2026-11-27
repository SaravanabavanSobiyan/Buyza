import { afterEach, describe, expect, test } from "vitest";
import { act, render, screen } from "@testing-library/react";
import OfflineBanner from "./OfflineBanner";

const setOnline = (value) => {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => value,
  });
  window.dispatchEvent(new Event(value ? "online" : "offline"));
};

afterEach(() => setOnline(true));

describe("OfflineBanner", () => {
  test("appears offline and disappears when the connection returns", () => {
    render(<OfflineBanner />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    act(() => setOnline(false));
    expect(screen.getByRole("status")).toHaveTextContent(/offline/i);
    act(() => setOnline(true));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
