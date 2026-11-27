import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";

export const signAccessToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtAccessSecret, {
    expiresIn: env.accessExpires,
  });

// rememberMe -> 30 day refresh token, otherwise 1 day (session cookie)
export const signRefreshToken = (user, rememberMe) =>
  jwt.sign({ sub: user._id.toString(), rm: !!rememberMe, jti: crypto.randomUUID() }, env.jwtRefreshSecret, {
    expiresIn: rememberMe ? "30d" : "1d",
  });

export const verifyAccessToken = (token) => jwt.verify(token, env.jwtAccessSecret);
export const verifyRefreshToken = (token) => jwt.verify(token, env.jwtRefreshSecret);

export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
export const randomToken = () => crypto.randomBytes(32).toString("hex");
