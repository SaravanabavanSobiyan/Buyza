import { env } from "../config/env.js";

export const REFRESH_COOKIE = "refreshToken";
export const OAUTH_STATE_COOKIE = "oauthState";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

// Cookie is only sent to /api/auth/* routes.
// In production (frontend and API on different domains) it must be SameSite=None + Secure.
const baseOptions = () => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: "lax",
  path: "/api/auth",
});

export const setRefreshCookie = (res, token, rememberMe) =>
  res.cookie(REFRESH_COOKIE, token, {
    ...baseOptions(),
    ...(rememberMe && { maxAge: THIRTY_DAYS }), // no maxAge = session cookie
  });

export const clearRefreshCookie = (res) => res.clearCookie(REFRESH_COOKIE, baseOptions());

const oauthStateOptions = () => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: "lax",
  path: "/api/auth",
  maxAge: 10 * 60 * 1000,
});

export const setOAuthStateCookie = (res, state) => res.cookie(OAUTH_STATE_COOKIE, state, oauthStateOptions());
export const clearOAuthStateCookie = (res) => res.clearCookie(OAUTH_STATE_COOKIE, {
  ...oauthStateOptions(),
  maxAge: undefined,
});
