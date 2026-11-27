import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as orderService from "../services/order.service.js";
import * as orderManageService from "../services/order.manage.service.js";
import { streamInvoice } from "../utils/invoicePdf.js";
import {
  CANCELLABLE_STATUSES,
  ORDER_STATUSES,
} from "../constants/order.js";
import { z } from "zod";

const ORDER_NUMBER = /^ORD-\d{4}-\d{6}$/;
const dateSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Invalid date");
const listQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.enum(ORDER_STATUSES).optional(),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
  })
  .refine(
    ({ from, to }) => !from || !to || from <= to,
    { message: "Start date must be on or before end date" }
  );

const toPublic = (order) => {
  const result = order.toObject();
  delete result.idempotencyKey;
  delete result.__v;
  result.canCancel = CANCELLABLE_STATUSES.includes(result.status);
  return result;
};

function requireOrderNumber(req) {
  if (!ORDER_NUMBER.test(req.params.orderNumber)) {
    throw new ApiError(404, "Order not found");
  }
  return req.params.orderNumber;
}

export const placeOrder = asyncHandler(async (req, res) => {
  const idempotencyKey = req.get("Idempotency-Key") || undefined;
  if (idempotencyKey && (idempotencyKey.length < 8 || idempotencyKey.length > 100)) {
    throw new ApiError(400, "Invalid Idempotency-Key");
  }

  const { order, created } = await orderService.placeOrder({
    userId: req.user?._id,
    userEmail: req.user?.email,
    body: req.body,
    idempotencyKey,
  });

  res.status(created ? 201 : 200).json({ success: true, order: toPublic(order) });
});

export const listOrders = asyncHandler(async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, "Invalid filters");

  const data = await orderManageService.listOrders({
    userId: req.user._id,
    ...parsed.data,
  });
  res.json({ success: true, ...data });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await orderManageService.getOrder({
    userId: req.user._id,
    orderNumber: requireOrderNumber(req),
  });
  res.json({ success: true, order: toPublic(order) });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await orderManageService.cancelOrder({
    userId: req.user._id,
    orderNumber: requireOrderNumber(req),
    reason: req.body.reason,
    note: req.body.note,
  });
  res.json({ success: true, order: toPublic(order) });
});

export const downloadInvoice = asyncHandler(async (req, res) => {
  const order = await orderManageService.getOrder({
    userId: req.user._id,
    orderNumber: requireOrderNumber(req),
  });
  streamInvoice(order, res);
});
