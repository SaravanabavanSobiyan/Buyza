import { describe, expect, it } from "vitest";
import { isOutside } from "./devOverflowCheck";

describe("isOutside", () => {
  it("detects content outside either viewport edge and ignores zero-width elements", () => {
    expect(isOutside({ left: 0, right: 322, width: 322 }, 320)).toBe(true);
    expect(isOutside({ left: -2, right: 20, width: 22 }, 320)).toBe(true);
    expect(isOutside({ left: 0, right: 320, width: 320 }, 320)).toBe(false);
    expect(isOutside({ left: 400, right: 400, width: 0 }, 320)).toBe(false);
  });
});
