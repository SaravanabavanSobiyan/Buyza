import { parseEnvironment } from "../src/config/env.js";

const productionConfig = {
  NODE_ENV: "production",
  MONGO_URI: "mongodb+srv://cluster.example.test/store",
  CLIENT_URL: "https://shop.example.test",
  SITE_URL: "https://shop.example.test",
  ALLOWED_ORIGINS: "https://shop.example.test,https://admin.example.test",
  TRUST_PROXY_HOPS: "1",
  JWT_ACCESS_SECRET: "a".repeat(40),
  JWT_REFRESH_SECRET: "b".repeat(40),
};

describe("environment validation", () => {
  test("accepts production config with explicit HTTPS origins and proxy hops", () => {
    const config = parseEnvironment(productionConfig);

    expect(config.allowedOrigins).toEqual([
      "https://shop.example.test",
      "https://admin.example.test",
    ]);
    expect(config.trustProxyHops).toBe(1);
  });

  test("rejects weak secrets and insecure production URLs without printing values", () => {
    const config = {
      ...productionConfig,
      JWT_ACCESS_SECRET: "private-short-value",
      JWT_REFRESH_SECRET: "private-short-value",
      SITE_URL: "http://shop.example.test",
    };

    let message = "";
    try {
      parseEnvironment(config);
    } catch (error) {
      message = error.message;
    }

    expect(message).toContain("JWT_ACCESS_SECRET");
    expect(message).toContain("JWT_REFRESH_SECRET");
    expect(message).toContain("SITE_URL");
    expect(message).not.toContain("private-short-value");
  });

  test("rejects origins containing paths", () => {
    expect(() =>
      parseEnvironment({
        ...productionConfig,
        ALLOWED_ORIGINS: "https://shop.example.test/store",
      })
    ).toThrow(/ALLOWED_ORIGINS/);
  });
});
