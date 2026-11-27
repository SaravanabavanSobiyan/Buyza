import { createHash } from "node:crypto";
import rateLimit from "express-rate-limit";
import { ApiError } from "../utils/ApiError.js";

const handler = (message) => (req, res, next) => next(new ApiError(429, message));
export const skipRateLimitsInTests = () =>
  process.env.NODE_ENV === "test" && process.env.DISABLE_RATE_LIMITS === "true";
const skipPreflight = (req) => skipRateLimitsInTests() || req.method === "OPTIONS";
const common = {
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
};

export const apiLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 500,
  skip: (req) => skipPreflight(req) || req.path === "/health",
  handler: handler("Too many requests. Try again later."),
});

export const registerLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 10,
  handler: handler("Too many registration attempts. Try again later."),
});

export const loginLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  handler: handler("Too many login attempts. Try again in 15 minutes."),
});

export const loginEmailLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    createHash("sha256")
      .update(String(req.body?.email || "").trim().toLowerCase())
      .digest("hex"),
  validate: { keyGeneratorIpFallback: false },
  handler: handler("Too many login attempts. Try again in 15 minutes."),
});

export const refreshLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 30,
  handler: handler("Too many session refreshes. Try again shortly."),
});

export const forgotPasswordLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  handler: handler("Too many password reset requests. Try again later."),
});

export const resetPasswordLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 10,
  handler: handler("Too many password reset attempts. Try again later."),
});
