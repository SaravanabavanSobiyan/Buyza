import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { audit } from "../services/audit.service.js";
import * as service from "../services/customer.service.js";

const HEX_ID = /^[0-9a-fA-F]{24}$/;
export const blockSchema = z.object({
  reason: z.string().trim().min(3, "Please give a reason (at least 3 characters)").max(300),
});
const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional().transform((v) => v || undefined),
  status: z.enum(["all", "active", "blocked"]).default("all"),
  sort: z.enum(["newest", "oldest", "spent", "orders", "name"]).default("newest"),
});
const ordersQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
const customerId = (req) => {
  if (!HEX_ID.test(req.params.id)) throw new ApiError(404, "Customer not found");
  return req.params.id;
};

export const list = asyncHandler(async (req, res) => {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, "Invalid filters");
  res.json({ success: true, ...(await service.listCustomers(parsed.data)) });
});
export const detail = asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await service.getCustomer(customerId(req))) });
});
export const orders = asyncHandler(async (req, res) => {
  const parsed = ordersQuery.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, "Invalid page or limit");
  res.json({ success: true, ...(await service.listCustomerOrders({ id: customerId(req), ...parsed.data })) });
});
export const block = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const { user, changed, openOrders } = await service.blockCustomer({ actor: req.user, targetId: customerId(req), reason });
  if (changed) {
    await audit(req, {
      action: "customer.blocked",
      entityType: "user",
      entityId: user._id,
      summary: `Blocked ${user.email}: ${reason}`,
      meta: { reason, openOrders },
    });
  }
  res.json({ success: true, changed, openOrders, customer: { _id: user._id, name: user.name, email: user.email, isBlocked: true } });
});
export const unblock = asyncHandler(async (req, res) => {
  const { user, changed, previousReason } = await service.unblockCustomer({ targetId: customerId(req) });
  if (changed) {
    await audit(req, {
      action: "customer.unblocked",
      entityType: "user",
      entityId: user._id,
      summary: `Unblocked ${user.email}`,
      meta: { previousReason },
    });
  }
  res.json({ success: true, changed, customer: { _id: user._id, name: user.name, email: user.email, isBlocked: false } });
});
