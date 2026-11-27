import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCategoryTree } from "../api/catalog";
import MobileMenu from "./MobileMenu";

vi.mock("../api/catalog", () => ({ getCategoryTree: vi.fn() }));

const Location = () => {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
};

function renderMenu(user = null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  function Harness() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <MobileMenu open={open} onClose={() => setOpen(false)} user={user} onLogout={() => setOpen(false)} />
        <Location />
      </>
    );
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>
        <Harness />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("MobileMenu", () => {
  beforeEach(() => {
    getCategoryTree.mockResolvedValue([
      { _id: "electronics", name: "Electronics", slug: "electronics", children: [
        { _id: "audio", name: "Audio", slug: "audio" },
      ] },
    ]);
  });

  it("shows categories, closes on navigation, and uses the app's search query parameter", async () => {
    const firstRender = renderMenu();

    fireEvent.click(await screen.findByRole("link", { name: "Audio" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByTestId("location")).toHaveTextContent("/category/audio");
    firstRender.unmount();

    const { unmount } = renderMenu();
    fireEvent.change(await screen.findByRole("searchbox", { name: "Search products" }), {
      target: { value: "smart watch" },
    });
    fireEvent.submit(screen.getByRole("search"));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/products?search=smart%20watch"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    unmount();
  });

  it("shows account actions for the current user's role", async () => {
    renderMenu({ role: "admin" });
    expect(await screen.findByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });
});
