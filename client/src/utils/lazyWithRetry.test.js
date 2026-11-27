import { describe, expect, test, vi } from "vitest";
import { isChunkError, loadWithRetry, reloadOnce } from "./lazyWithRetry";

const memoryStorage = () => {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
  };
};

describe("isChunkError", () => {
  test.each([
    "Failed to fetch dynamically imported module: https://shop.test/assets/Page-abc.js",
    "error loading dynamically imported module",
    "Importing a module script failed.",
    "Loading chunk 12 failed.",
  ])("recognises: %s", (message) => {
    expect(isChunkError(new Error(message))).toBe(true);
  });

  test("ignores every other kind of error", () => {
    expect(isChunkError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isChunkError(null)).toBe(false);
  });
});

describe("reloadOnce", () => {
  test("reloads once per 10-second window", () => {
    const reload = vi.fn();
    const storage = memoryStorage();
    let time = 1_000_000;
    expect(reloadOnce({ reload, now: () => time, storage })).toBe(true);
    time += 5_000;
    expect(reloadOnce({ reload, now: () => time, storage })).toBe(false);
    time += 6_000;
    expect(reloadOnce({ reload, now: () => time, storage })).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });
});

describe("loadWithRetry", () => {
  const stale = () =>
    Promise.reject(new Error("Failed to fetch dynamically imported module: /assets/x.js"));
  const pending = (promise) =>
    Promise.race([
      promise.then(() => "settled", () => "settled"),
      new Promise((resolve) => setTimeout(() => resolve("pending"), 20)),
    ]);

  test("passes successful imports through", async () => {
    const mod = { default: () => null };
    await expect(
      loadWithRetry(() => Promise.resolve(mod), {
        reload: vi.fn(),
        storage: memoryStorage(),
      }),
    ).resolves.toBe(mod);
  });

  test("reloads stale chunks once and never settles", async () => {
    const reload = vi.fn();
    const result = loadWithRetry(stale, {
      reload,
      now: () => 1_000_000,
      storage: memoryStorage(),
    });
    expect(await pending(result)).toBe("pending");
    expect(reload).toHaveBeenCalledTimes(1);
  });

  test("flags a chunk error after an earlier reload instead of looping", async () => {
    const reload = vi.fn();
    const storage = memoryStorage();
    const options = { reload, now: () => 1_000_000, storage };
    await pending(loadWithRetry(stale, options));
    await expect(loadWithRetry(stale, options)).rejects.toMatchObject({ isChunkError: true });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  test("passes unrelated errors through", async () => {
    const reload = vi.fn();
    await expect(
      loadWithRetry(() => Promise.reject(new Error("boom")), {
        reload,
        storage: memoryStorage(),
      }),
    ).rejects.toThrow("boom");
    expect(reload).not.toHaveBeenCalled();
  });

  test("does not reload when a chunk fails while offline", async () => {
    const reload = vi.fn();
    vi.stubGlobal("navigator", { onLine: false });
    try {
      await expect(
        loadWithRetry(stale, { reload, storage: memoryStorage() }),
      ).rejects.toMatchObject({ isOfflineChunkError: true });
      expect(reload).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
