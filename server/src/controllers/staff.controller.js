import { z } from "zod";
import { ROLES, permissionsFor } from "../constants/permissions.js";
import { audit } from "../services/audit.service.js";
import * as service from "../services/staff.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const roleSchema = z.object({ role: z.enum(ROLES) });
export const blockSchema = z.object({
  isBlocked: z.boolean(),
  reason: z.string().trim().max(500).optional().default(""),
});

const searchSchema = z.object({ q: z.string().trim().min(2).max(100) });
const customerQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["all", "active", "blocked"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    role: req.user.role,
    permissions: permissionsFor(req.user.role),
  });
});

export const list = asyncHandler(async (req, res) => {
  res.json({ success: true, staff: await service.listStaff() });
});

export const search = asyncHandler(async (req, res) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, "Type at least 2 characters");
  res.json({ success: true, users: await service.searchUsers(parsed.data.q) });
});

export const customers = asyncHandler(async (req, res) => {
  const parsed = customerQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, "Invalid customer filters");
  res.json({ success: true, ...(await service.listCustomers(parsed.data)) });
});

export const changeRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!/^[0-9a-fA-F]{24}$/.test(id)) throw new ApiError(404, "User not found");

  const { user, previousRole } = await service.changeRole({
    actor: req.user,
    targetId: id,
    role: req.body.role,
  });

  if (previousRole !== user.role) {
    await audit(req, {
      action: "user.role_changed",
      entityType: "user",
      entityId: user._id,
      summary: `Changed ${user.email} from ${previousRole} to ${user.role}`,
      meta: { from: previousRole, to: user.role },
    });
  }

  res.json({ success: true, user });
});

export const setBlocked = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!/^[0-9a-fA-F]{24}$/.test(id)) throw new ApiError(404, "User not found");

  const { user, changed } = await service.setBlocked({
    actor: req.user,
    targetId: id,
    isBlocked: req.body.isBlocked,
    reason: req.body.reason,
  });

  if (changed) {
    await audit(req, {
      action: user.isBlocked ? "user.blocked" : "user.unblocked",
      entityType: "user",
      entityId: user._id,
      summary: `${user.isBlocked ? "Suspended" : "Reactivated"} ${user.email}`,
      meta: {
        isBlocked: user.isBlocked,
        reason: user.isBlocked ? user.blockedReason : undefined,
      },
    });
  }

  res.json({ success: true, user });
});
