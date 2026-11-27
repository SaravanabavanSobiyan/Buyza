import mongoose from "mongoose";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { toSafeUser } from "../utils/serializers.js";
import { env } from "../config/env.js";
import { verifyRefreshToken, sha256, randomToken } from "../utils/tokens.js";
import { OAUTH_STATE_COOKIE, REFRESH_COOKIE, clearOAuthStateCookie, clearRefreshCookie, setOAuthStateCookie } from "../utils/cookies.js";
import { issueSession } from "../services/auth.service.js";
import { sendWelcomeEmail, sendPasswordResetEmail } from "../services/email.service.js";
import { getAuthorizationUrl, getOAuthProfile } from "../services/oauth.service.js";

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (await User.exists({ email })) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const user = await User.create({ name, email, password });
  sendWelcomeEmail(user).catch((e) => console.error("Welcome email failed:", e.message));

  const accessToken = await issueSession(res, user, false);
  res.status(201).json({ success: true, data: { user: toSafeUser(user), accessToken } });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;

  const user = await User.findOne({ email }).select("+password");
  const valid = user && (await user.comparePassword(password));
  if (!valid) throw new ApiError(401, "Invalid email or password"); // same message for both cases
  if (user.isBlocked) {
    throw new ApiError(
      403,
      "Your account has been suspended. Please contact us.",
      undefined,
      "ACCOUNT_SUSPENDED"
    );
  }

  const accessToken = await issueSession(res, user, rememberMe);
  res.json({ success: true, data: { user: toSafeUser(user), accessToken } });
});

// Uses the httpOnly cookie to issue a fresh access token (and rotates the refresh token)
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies[REFRESH_COOKIE];
  if (!token) throw new ApiError(401, "Not authenticated");

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    clearRefreshCookie(res);
    throw new ApiError(401, "Session expired. Log in again.");
  }

  const user = await User.findById(payload.sub).select("+refreshTokenHash");
  if (!user) {
    throw new ApiError(401, "Session expired. Log in again.");
  }
  if (user.isBlocked) {
    await User.updateOne({ _id: user._id }, { $unset: { refreshTokenHash: 1 } });
    clearRefreshCookie(res);
    throw new ApiError(
      403,
      "Your account has been suspended. Please contact us.",
      undefined,
      "ACCOUNT_SUSPENDED"
    );
  }
  if (user.refreshTokenHash !== sha256(token)) {
    throw new ApiError(401, "Session expired. Log in again.");
  }

  const accessToken = await issueSession(res, user, payload.rm);
  res.json({ success: true, data: { user: toSafeUser(user), accessToken } });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies[REFRESH_COOKIE];
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await User.updateOne({ _id: payload.sub }, { $unset: { refreshTokenHash: 1 } });
    } catch {
      // expired or invalid token: nothing to revoke
    }
  }
  clearRefreshCookie(res);
  res.json({ success: true, message: "Logged out" });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (user && !user.isBlocked) {
    const token = randomToken();
    await User.updateOne(
      { _id: user._id },
      {
        resetPasswordToken: sha256(token), // only the hash is stored
        resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000),
      }
    );
    const link = `${env.clientUrl}/reset-password/${token}`;
    sendPasswordResetEmail(user, link).catch((e) => console.error("Reset email failed:", e.message));
  }

  // Same response whether or not the email exists (prevents account enumeration)
  res.json({
    success: true,
    message: "If that email is registered, a reset link is on its way.",
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: sha256(req.params.token),
    resetPasswordExpires: mongoose.trusted({ $gt: new Date() }),
  });
  if (!user) throw new ApiError(400, "This reset link is invalid or has expired");

  user.password = req.body.password; // hashed by the pre-save hook
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.refreshTokenHash = undefined; // log out everywhere
  await user.save();

  clearRefreshCookie(res);
  res.json({ success: true, message: "Password updated. You can log in now." });
});

const oauthProviders = new Set(["google", "facebook"]);

export const startOAuth = asyncHandler(async (req, res) => {
  const { provider } = req.params;
  if (!oauthProviders.has(provider)) throw new ApiError(400, "Unsupported sign-in provider");
  const state = randomToken();
  setOAuthStateCookie(res, state);
  try {
    res.redirect(getAuthorizationUrl(provider, state));
  } catch (oauthError) {
    clearOAuthStateCookie(res);
    res.redirect(`${env.clientUrl}/oauth/callback?error=${encodeURIComponent(oauthError.message)}`);
  }
});

export const finishOAuth = asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const { code, state, error } = req.query;
  if (!oauthProviders.has(provider)) throw new ApiError(400, "Unsupported sign-in provider");
  if (error || !code || !state || state !== req.cookies[OAUTH_STATE_COOKIE]) {
    clearOAuthStateCookie(res);
    return res.redirect(`${env.clientUrl}/oauth/callback?error=cancelled`);
  }

  try {
    const profile = await getOAuthProfile(provider, code);
    let user = await User.findOne({ $or: [{ email: profile.email }, { authProvider: provider, providerId: profile.providerId }] });

    if (!user) {
      user = await User.create({
        name: profile.name,
        email: profile.email,
        password: randomToken(),
        authProvider: provider,
        providerId: profile.providerId,
        isVerified: true,
        ...(profile.avatarUrl && { avatar: { url: profile.avatarUrl } }),
      });
      sendWelcomeEmail(user).catch((e) => console.error("Welcome email failed:", e.message));
    } else if (user.isBlocked) {
      throw new ApiError(
        403,
        "Your account has been suspended. Please contact us.",
        undefined,
        "ACCOUNT_SUSPENDED"
      );
    } else if (user.authProvider === "local") {
      user.authProvider = provider;
      user.providerId = profile.providerId;
      if (!user.avatar?.url && profile.avatarUrl) user.avatar = { url: profile.avatarUrl };
      await user.save();
    }

    clearOAuthStateCookie(res);
    await issueSession(res, user, true);
    res.redirect(`${env.clientUrl}/oauth/callback`);
  } catch (oauthError) {
    clearOAuthStateCookie(res);
    console.error(`${provider} OAuth callback failed:`, oauthError.message);
    const message = oauthError instanceof ApiError ? oauthError.message : "Social sign in failed. Please try again.";
    res.redirect(`${env.clientUrl}/oauth/callback?error=${encodeURIComponent(message)}`);
  }
});
