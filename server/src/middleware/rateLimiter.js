import rateLimit from "express-rate-limit";
import { ApiError } from "../utils/ApiError.js";

const handler = (message) => (req, res, next) => next(new ApiError(429, message));

// 10 failed login attempts per 15 minutes per IP (successful logins don't count)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler("Too many login attempts. Try again in 15 minutes."),
});

// 5 reset requests per hour per IP
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler("Too many requests. Try again later."),
});
