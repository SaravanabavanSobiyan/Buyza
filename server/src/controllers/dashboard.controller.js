import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { isRealDate, resolveRange } from '../utils/dateRange.js';
import * as service from '../services/dashboard.service.js';

const ymd = z.string().refine(isRealDate, 'Invalid date');
const rangeQuery = z.object({ from: ymd.optional(), to: ymd.optional() });
const topQuery = rangeQuery.extend({
  limit: z.coerce.number().int().min(1).max(20).default(5),
  by: z.enum(['revenue', 'quantity']).default('revenue'),
});
const lowStockQuery = z.object({ limit: z.coerce.number().int().min(1).max(50).default(10) });

const parse = (schema, query) => {
  const parsed = schema.safeParse(query);
  if (!parsed.success) throw new ApiError(400, 'Invalid date range or options');
  return parsed.data;
};

export const summary = asyncHandler(async (req, res) => {
  const range = resolveRange(parse(rangeQuery, req.query));
  res.json({ success: true, ...(await service.getSummary(range)) });
});
export const salesOverTime = asyncHandler(async (req, res) => {
  const range = resolveRange(parse(rangeQuery, req.query));
  res.json({ success: true, days: await service.getSalesOverTime(range) });
});
export const ordersByStatus = asyncHandler(async (req, res) => {
  const range = resolveRange(parse(rangeQuery, req.query));
  res.json({ success: true, ...(await service.getOrdersByStatus(range)) });
});
export const topProducts = asyncHandler(async (req, res) => {
  const { limit, by, ...dates } = parse(topQuery, req.query);
  const range = resolveRange(dates);
  res.json({ success: true, products: await service.getTopProducts(range, { limit, by }) });
});
export const lowStock = asyncHandler(async (req, res) => {
  const { limit } = parse(lowStockQuery, req.query);
  res.json({ success: true, ...(await service.getLowStock({ limit })) });
});
