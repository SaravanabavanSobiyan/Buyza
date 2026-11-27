import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "./[...path].js";

const createResponse = () => ({
  status: vi.fn().mockReturnThis(),
  setHeader: vi.fn(),
  end: vi.fn(),
  json: vi.fn(),
});

const createUpstreamResponse = ({ status, body, cookies = [] }) => ({
  status,
  headers: {
    get: (name) => (name === "content-type" ? "application/json" : null),
    getSetCookie: () => cookies,
  },
  arrayBuffer: async () => Uint8Array.from([...body].map((character) => character.charCodeAt(0))).buffer,
});

describe("Vercel API proxy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("forwards API requests and preserves refresh cookies", async () => {
    vi.stubEnv("BUYZA_API_ORIGIN", "https://buyza-api.onrender.com");
    const cookies = [
      "refreshToken=first; Path=/api/auth; HttpOnly",
      "oauthState=second; Path=/api/auth; HttpOnly",
    ];
    const fetch = vi.fn().mockResolvedValue(
      createUpstreamResponse({ status: 200, body: '{"ok":true}', cookies }),
    );
    vi.stubGlobal("fetch", fetch);
    const res = createResponse();

    await handler(
      {
        url: "/api/products?sort=newest",
        method: "GET",
        headers: { cookie: "refreshToken=current", host: "buyza.vercel.app" },
      },
      res,
    );

    expect(fetch).toHaveBeenCalledWith(
      new URL("https://buyza-api.onrender.com/api/products?sort=newest"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetch.mock.calls[0][1].headers.get("cookie")).toBe("refreshToken=current");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.setHeader).toHaveBeenCalledWith("set-cookie", cookies);
    expect(res.end).toHaveBeenCalledWith(globalThis.Buffer.from('{"ok":true}'));
  });

  it("returns an explicit configuration error if the API origin is missing", async () => {
    vi.stubEnv("BUYZA_API_ORIGIN", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const res = createResponse();

    await handler({ url: "/api/products", method: "GET", headers: {} }, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ message: "The API proxy is not configured." });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns a gateway error when the API service cannot be reached", async () => {
    vi.stubEnv("BUYZA_API_ORIGIN", "https://buyza-api.onrender.com");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const res = createResponse();

    await handler({ url: "/api/products", method: "GET", headers: {} }, res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      message: "The API service is temporarily unavailable.",
    });
  });
});
