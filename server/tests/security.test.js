import request from "supertest";
import app from "../src/app.js";
import User from "../src/models/User.js";
import { makeUser, startDb, stopDb } from "./helpers.js";

beforeAll(startDb);
afterAll(stopDb);

describe("API security middleware", () => {
  test("sets security headers and only enables HSTS in production", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["content-security-policy"]).toBeDefined();
    expect(res.headers["strict-transport-security"]).toBeUndefined();
  });

  test("allows requests without Origin and only reflects configured origins", async () => {
    const noOrigin = await request(app).get("/api/health");
    const allowed = await request(app).get("/api/health").set("Origin", "https://shop.test");
    const denied = await request(app).get("/api/health").set("Origin", "https://evil.test");

    expect(noOrigin.status).toBe(200);
    expect(allowed.headers["access-control-allow-origin"]).toBe("https://shop.test");
    expect(allowed.headers["access-control-allow-credentials"]).toBe("true");
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });

  test("exposes a root health endpoint that pings MongoDB", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  test("rejects oversized JSON bodies and NoSQL operator fields", async () => {
    const oversized = await request(app)
      .post("/api/auth/login")
      .send({ email: "a".repeat(110_000), password: "Password123" });
    const injected = await request(app).get("/api/products?name%5B%24gt%5D=");

    expect(oversized.status).toBe(413);
    expect(oversized.body.message).toBe("Request body is too large");
    expect(injected.status).toBe(400);
  });

  test("rejects cookie-authenticated mutations without a non-simple request marker", async () => {
    const blocked = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", "refreshToken=not-a-token");
    const accepted = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", "refreshToken=not-a-token")
      .set("X-Requested-With", "XMLHttpRequest");

    expect(blocked.status).toBe(403);
    expect(accepted.status).toBe(200);
  });

  test("returns 429 on the sixth failed login in the window", async () => {
    const previous = process.env.DISABLE_RATE_LIMITS;
    process.env.DISABLE_RATE_LIMITS = "false";
    await makeUser({ email: "rate-limit@example.test" });

    try {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const res = await request(app)
          .post("/api/auth/login")
          .send({ email: "rate-limit@example.test", password: "WrongPassword123" });
        expect(res.status).toBe(401);
      }

      const blocked = await request(app)
        .post("/api/auth/login")
        .send({ email: "rate-limit@example.test", password: "WrongPassword123" });
      expect(blocked.status).toBe(429);
    } finally {
      if (previous === undefined) delete process.env.DISABLE_RATE_LIMITS;
      else process.env.DISABLE_RATE_LIMITS = previous;
      await User.deleteMany();
    }
  });
});
