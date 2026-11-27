import User from "../models/User.js";
import { signAccessToken, signRefreshToken, sha256 } from "../utils/tokens.js";
import { setRefreshCookie } from "../utils/cookies.js";

// Creates a new session: access token in the response body,
// refresh token in an httpOnly cookie (its hash is stored on the user).
export async function issueSession(res, user, rememberMe = false) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, rememberMe);
  await User.updateOne({ _id: user._id }, { refreshTokenHash: sha256(refreshToken) });
  setRefreshCookie(res, refreshToken, rememberMe);
  return accessToken;
}
