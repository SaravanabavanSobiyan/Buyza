import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

const Bomb = ({ explode }) => {
  if (explode) throw new Error("kaboom");
  return <p>all good</p>;
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("ErrorBoundary", () => {
  test("renders children normally", () => {
    render(<ErrorBoundary><Bomb explode={false} /></ErrorBoundary>);
    expect(screen.getByText("all good")).toBeInTheDocument();
  });

  test("shows fallback and reports caught errors", () => {
    const onError = vi.fn();
    render(<ErrorBoundary onError={onError}><Bomb explode /></ErrorBoundary>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  test("Try again renders recovered children", () => {
    let explode = true;
    const Flaky = () => {
      if (explode) throw new Error("flaky");
      return <p>recovered</p>;
    };
    render(<ErrorBoundary><Flaky /></ErrorBoundary>);
    explode = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("recovered")).toBeInTheDocument();
  });

  test("reset keys recover the boundary after navigation", () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={["/a"]}><Bomb explode /></ErrorBoundary>,
    );
    rerender(
      <ErrorBoundary resetKeys={["/b"]}><Bomb explode={false} /></ErrorBoundary>,
    );
    expect(screen.getByText("all good")).toBeInTheDocument();
  });

  test("stale chunk errors offer reload only", () => {
    const Stale = () => {
      throw new Error("Failed to fetch dynamically imported module: /assets/x.js");
    };
    render(<ErrorBoundary><Stale /></ErrorBoundary>);
    expect(screen.getByText("A new version is available")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });
});
