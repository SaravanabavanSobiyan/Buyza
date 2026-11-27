import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { audit } from "../services/audit.service.js";
import * as service from "../services/order.admin.service.js";
import * as queries from "../services/order.adminQuery.service.js";
import { streamInvoice } from "../utils/invoicePdf.js";
import { streamPackingSlip } from "../utils/packingSlipPdf.js";
import { can } from "../constants/permissions.js";
import { ORDER_STATUSES } from "../constants/order.js";
import { nextStatuses, canMarkPaid } from "../constants/orderFlow.js";

const ORDER_NUMBER = /^ORD-\d{4}-\d{6}$/;
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const statusSchema = z
  .object({
    status: z.enum(["processing", "shipped", "delivered", "cancelled"]),
    note: z.string().trim().max(300).optional(),
  })
  .superRefine((data, context) => {
    if (data.status === "cancelled" && (data.note || "").length < 3) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "Please give a reason for cancelling (at least 3 characters)",
      });
    }
  });

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(ORDER_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
  paymentStatus: z.enum(["pending", "paid", "failed", "refund_pending", "refunded"]).optional(),
  paymentMethod: z.enum(["cod", "card"]).optional(),
  from: date.optional(),
  to: date.optional(),
  q: z.string().trim().max(100).optional().transform((value) => value || undefined),
  sort: z.enum(["newest", "oldest", "total_high", "total_low"]).default("newest"),
});

const orderNumber = (req) => {
  if (!ORDER_NUMBER.test(req.params.orderNumber)) {
    throw new ApiError(404, "Order not found");
  }
  return req.params.orderNumber;
};

const present = (order, user) => {
  const result = order.toObject();
  delete result.idempotencyKey;
  delete result.__v;
  result.allowedTransitions = nextStatuses(result, {
    canCancel: can(user.role, "orders:cancel"),
  });
  result.canMarkPaid =
    canMarkPaid(result) && can(user.role, "orders:mark_paid");
  return result;
};

export const list = asyncHandler(async (req, res) => {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, "Invalid filters");
  if (parsed.data.from && parsed.data.to && parsed.data.from > parsed.data.to) {
    throw new ApiError(400, '"From" date must be before "To" date');
  }
  const data = {
    ...parsed.data,
    q: parsed.data.q || parsed.data.search || undefined,
  };
  delete data.search;
  res.json({ success: true, ...(await queries.listOrders(data)) });
});

export const detail = asyncHandler(async (req, res) => {
  const { order, customer } = await queries.getOrderDetail(orderNumber(req));
  res.json({
    success: true,
    order: present(order, req.user),
    customer,
  });
});

export const invoice = asyncHandler(async (req, res) => {
  streamInvoice(await queries.getOrderOrFail(orderNumber(req)), res);
});

export const packingSlip = asyncHandler(async (req, res) => {
  streamPackingSlip(await queries.getOrderOrFail(orderNumber(req)), res);
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (status === "cancelled" && !can(req.user.role, "orders:cancel")) {
    throw new ApiError(403, "You do not have permission to cancel orders");
  }

  const order = await service.updateStatus({
    orderNumber: orderNumber(req),
    status,
    note,
  });
  const history = order.statusHistory;
  const from = history.length > 1 ? history[history.length - 2].status : null;

  await audit(req, {
    action: "order.status_changed",
    entityType: "order",
    entityId: order.orderNumber,
    summary: `Order ${order.orderNumber}: ${from ?? "?"} -> ${status}`,
    meta: { from, to: status, note: note || undefined },
  });
  res.json({ success: true, order: present(order, req.user) });
});

export const markPaid = asyncHandler(async (req, res) => {
  const order = await service.markCodPaid({
    orderNumber: orderNumber(req),
  });
  await audit(req, {
    action: "order.marked_paid",
    entityType: "order",
    entityId: order.orderNumber,
    summary: `Order ${order.orderNumber} marked as paid (cash on delivery)`,
    meta: { total: order.total },
  });
  res.json({ success: true, order: present(order, req.user) });
});
