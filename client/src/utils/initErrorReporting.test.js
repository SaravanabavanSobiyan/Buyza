import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@sentry/browser", () => ({
  init: vi.fn(),
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/browser";
import { initializeErrorReporting } from "./initErrorReporting";

describe("optional Sentry reporting", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_SENTRY_DSN", "");
    Sentry.init.mockClear();
    Sentry.captureException.mockClear();
    delete window.__errorReporter;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.__errorReporter;
  });

  test("does not initialize without a DSN", async () => {
    await initializeErrorReporting();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  test("captures sanitized context when configured", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://public@sentry.example/1");
    await initializeErrorReporting();

    const error = new Error("request failed");
    window.__errorReporter(error, {
      type: "http",
      status: 500,
      url: "https://shop.example/api/auth/reset-password/secret-token?email=private@example.test",
      email: "private@example.test",
    });

    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      extra: {
        type: "http",
        status: 500,
        url: "https://shop.example/api/auth/reset-password/[redacted]",
      },
    });
    const { beforeSend } = Sentry.init.mock.calls[0][0];
    const event = beforeSend({
      request: {
        url: "https://shop.example/api/auth/reset-password/secret-token?email=private@example.test",
        headers: { Authorization: "token", Cookie: "session", Accept: "application/json" },
        cookies: "session",
        data: "private request body",
      },
    });

    expect(event.request.url).toBe("https://shop.example/api/auth/reset-password/[redacted]");
    expect(event.request.headers).toEqual({ Accept: "application/json" });
    expect(event.request.cookies).toBeUndefined();
    expect(event.request.data).toBeUndefined();
  });
});
