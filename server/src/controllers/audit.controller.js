import { z } from "zod";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as service from "../services/audit.service.js";

const isValidDate = (value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isValidDate);
const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  action: z.string().trim().min(1).max(60).optional(),
  entityType: z.string().trim().min(1).max(40).optional(),
  actor: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  from: date.optional(),
  to: date.optional(),
});

export const list = asyncHandler(async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, "Invalid audit log filters");
  if (parsed.data.from && parsed.data.to && parsed.data.from > parsed.data.to) {
    throw new ApiError(400, '"From" date must be before or equal to "To" date');
  }
  const data = await service.listAuditLogs(parsed.data);
  res.json({ success: true, ...data });
});

export const actions = asyncHandler(async (req, res) => {
  const actions = await service.listAuditActions();
  res.json({ success: true, actions: actions.sort() });
});
