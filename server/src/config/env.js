import "dotenv/config";
import { z } from "zod";

const secret = z.string().min(32, "must be at least 32 characters");

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    MONGO_URI: z.string().optional(),
    CLIENT_URL: z.string().url().default("http://localhost:5173"),
    ALLOWED_ORIGINS: z.string().optional(),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).optional(),
    ENABLE_HSTS: z.enum(["true", "false"]).default("false"),
    API_URL: z.string().url().default("http://localhost:5000/api"),
    SITE_URL: z.string().url().optional(),
    ALLOW_INDEXING: z.enum(["true", "false"]).default("false"),
    JWT_ACCESS_SECRET: secret,
    JWT_REFRESH_SECRET: secret,
    JWT_ACCESS_EXPIRES: z.string().default("15m"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().default("Shop <no-reply@shop.local>"),
    STORE_NAME: z.string().optional(),
    RECAPTCHA_SECRET: z.string().optional(),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    FACEBOOK_APP_ID: z.string().optional(),
    FACEBOOK_APP_SECRET: z.string().optional(),
  })
  .superRefine((config, ctx) => {
    if (config.NODE_ENV !== "test" && !config.MONGO_URI) {
      ctx.addIssue({ code: "custom", path: ["MONGO_URI"], message: "is required" });
    }

    if (config.NODE_ENV === "production") {
      if (!config.SITE_URL || !config.SITE_URL.startsWith("https://")) {
        ctx.addIssue({ code: "custom", path: ["SITE_URL"], message: "must be an HTTPS URL in production" });
      }
      if (!config.ALLOWED_ORIGINS?.trim()) {
        ctx.addIssue({ code: "custom", path: ["ALLOWED_ORIGINS"], message: "is required in production" });
      }
      if (config.TRUST_PROXY_HOPS === undefined) {
        ctx.addIssue({ code: "custom", path: ["TRUST_PROXY_HOPS"], message: "must be set for the selected host" });
      }
      if (config.ENABLE_HSTS === "true" && (!config.SITE_URL || !config.SITE_URL.startsWith("https://"))) {
        ctx.addIssue({ code: "custom", path: ["ENABLE_HSTS"], message: "requires HTTPS to be configured first" });
      }
    }

    const origins = config.ALLOWED_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];
    for (const origin of origins) {
      try {
        const parsed = new URL(origin);
        if (!["http:", "https:"].includes(parsed.protocol) || parsed.origin !== origin) {
          throw new Error("invalid origin");
        }
      } catch {
        ctx.addIssue({
          code: "custom",
          path: ["ALLOWED_ORIGINS"],
          message: "must contain comma-separated origins without paths or trailing slashes",
        });
        break;
      }
    }
  });

export function parseEnvironment(source) {
  const result = environmentSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${details.join("\n")}`);
  }

  const config = result.data;
  const allowedOrigins = config.ALLOWED_ORIGINS
    ? config.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
    : [new URL(config.CLIENT_URL).origin];

  return {
    nodeEnv: config.NODE_ENV,
    isProd: config.NODE_ENV === "production",
    port: config.PORT,
    mongoUri: config.MONGO_URI,
    clientUrl: config.CLIENT_URL,
    allowedOrigins,
    trustProxyHops: config.TRUST_PROXY_HOPS ?? 0,
    enableHsts: config.ENABLE_HSTS === "true",
    apiUrl: config.API_URL,
    siteUrl: config.SITE_URL,
    allowIndexing: config.ALLOW_INDEXING === "true",
    jwtAccessSecret: config.JWT_ACCESS_SECRET,
    jwtRefreshSecret: config.JWT_REFRESH_SECRET,
    accessExpires: config.JWT_ACCESS_EXPIRES,
    smtp: {
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
      from: config.EMAIL_FROM,
    },
    storeName: config.STORE_NAME,
    recaptchaSecret: config.RECAPTCHA_SECRET,
    cloudinary: {
      cloudName: config.CLOUDINARY_CLOUD_NAME,
      apiKey: config.CLOUDINARY_API_KEY,
      apiSecret: config.CLOUDINARY_API_SECRET,
    },
    oauth: {
      google: {
        clientId: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
      },
      facebook: {
        clientId: config.FACEBOOK_APP_ID,
        clientSecret: config.FACEBOOK_APP_SECRET,
      },
    },
  };
}

export const env = parseEnvironment(process.env);
