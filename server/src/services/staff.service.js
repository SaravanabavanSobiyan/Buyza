import User from "../models/User.js";
import { STAFF_ROLES } from "../constants/permissions.js";
import { ApiError } from "../utils/ApiError.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const listStaff = () =>
  User.find({ role: { $in: STAFF_ROLES } })
    .select("name email role isBlocked createdAt")
    .sort({ role: 1, name: 1 })
    .lean();

export const searchUsers = (query) => {
  const expression = new RegExp(escapeRegex(query), "i");
  return User.find({
    $or: [{ name: expression }, { email: expression }],
  })
    .select("name email role isBlocked")
    .limit(10)
    .lean();
};

export const listCustomers = async ({ q, status, page, limit }) => {
  const filter = { role: "customer" };
  if (status === "blocked") filter.isBlocked = true;
  if (status === "active") filter.isBlocked = { $ne: true };
  if (q) {
    const expression = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: expression }, { email: expression }];
  }

  const [customers, total] = await Promise.all([
    User.find(filter)
      .select("name email phone isBlocked blockedReason blockedAt createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);
  return {
    customers,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};

export const changeRole = async ({ actor, targetId, role }) => {
  if (String(actor._id) === String(targetId)) {
    throw new ApiError(400, "You can't change your own role");
  }

  const target = await User.findById(targetId).select("name email role");
  if (!target) throw new ApiError(404, "User not found");
  if (target.role === role) return { user: target, previousRole: role };

  if (target.role === "admin" && role !== "admin") {
    const adminCount = await User.countDocuments({ role: "admin", isBlocked: { $ne: true } });
    if (adminCount <= 1) throw new ApiError(409, "There must be at least one admin");
  }

  const previousRole = target.role;
  const user = await User.findByIdAndUpdate(
    targetId,
    { $set: { role } },
    { new: true, runValidators: true }
  ).select("name email role");

  return { user, previousRole };
};

export const setBlocked = async ({ actor, targetId, isBlocked, reason = "" }) => {
  const target = await User.findById(targetId).select(
    "name email role isBlocked blockedReason"
  );
  if (!target) throw new ApiError(404, "User not found");
  if (String(actor._id) === String(target._id) && isBlocked) {
    throw new ApiError(400, "You can't suspend your own account");
  }
  if (actor.role !== "admin" && target.role !== "customer") {
    throw new ApiError(403, "You can only suspend customer accounts");
  }
  if (target.role === "admin" && isBlocked) {
    const adminCount = await User.countDocuments({ role: "admin", isBlocked: { $ne: true } });
    if (!target.isBlocked && adminCount <= 1) {
      throw new ApiError(409, "There must be at least one active admin");
    }
  }

  const user = await User.findByIdAndUpdate(
    targetId,
    {
      $set: {
        isBlocked,
        blockedReason: isBlocked ? reason.trim() : "",
        blockedAt: isBlocked ? new Date() : null,
      },
      ...(isBlocked && { $unset: { refreshTokenHash: 1 } }),
    },
    { new: true, runValidators: true }
  ).select("name email role isBlocked blockedReason blockedAt");

  return { user, changed: target.isBlocked !== isBlocked };
};
