import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { can } from "../constants/permissions.js";

export const suspended = () =>
  new ApiError(
    403,
    "Your account has been suspended. Please contact us.",
    undefined,
    "ACCOUNT_SUSPENDED"
  );

// Requires a valid access token: Authorization: Bearer <token>
export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new ApiError(401, "Not authenticated");

  let payload;
  try {
    payload = verifyAccessToken(header.slice(7));
  } catch {
    throw new ApiError(401, "Session expired");
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, "Not authenticated");
  if (user.isBlocked) throw suspended();

  req.user = user;
  next();
});

// Role check, use after protect: restrictTo("admin", "manager")
export const restrictTo = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : next(new ApiError(403, "You don't have permission to do that"));

export const requirePermission =
  (...permissions) =>
  (req, res, next) => {
    if (!req.user) return next(new ApiError(401, "Not authenticated"));
    if (!permissions.every((permission) => can(req.user.role, permission))) {
      return next(new ApiError(403, "You don't have permission to do that"));
    }
    return next();
  };
