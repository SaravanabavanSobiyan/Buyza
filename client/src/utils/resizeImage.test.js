import { describe, expect, test } from "vitest";
import { getCappedDimensions } from "./resizeImage";

describe("product image dimensions", () => {
  test.each([
    [4000, 2000, { width: 2000, height: 1000 }],
    [1000, 4000, { width: 500, height: 2000 }],
    [1600, 1200, { width: 1600, height: 1200 }],
  ])("caps %i x %i without changing the aspect ratio", (width, height, expected) => {
    expect(getCappedDimensions(width, height)).toEqual(expected);
  });
});
