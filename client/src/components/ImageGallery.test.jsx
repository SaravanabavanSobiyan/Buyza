import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ImageGallery from "./ImageGallery";

describe("ImageGallery", () => {
  it("changes the active image with keyboard navigation", () => {
    render(<ImageGallery images={["/one.jpg", "/two.jpg"]} alt="Product" />);
    const carousel = screen.getByRole("region", { name: "Product images" });

    expect(screen.getByText("Image 1 of 2")).toBeInTheDocument();
    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    expect(screen.getByText("Image 2 of 2")).toBeInTheDocument();
  });

  it("changes images with a horizontal touch swipe", () => {
    render(<ImageGallery images={["/one.jpg", "/two.jpg"]} alt="Product" />);
    const carousel = screen.getByRole("region", { name: "Product images" });

    fireEvent.touchStart(carousel, { touches: [{ clientX: 240 }] });
    fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 120 }] });
    expect(screen.getByText("Image 2 of 2")).toBeInTheDocument();
  });
});
