import Order from "../models/Order.js";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { ORDER_STATUSES } from "../constants/order.js";

const COLOMBO = "+05:30";
const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  total_high: { total: -1, _id: -1 },
  total_low: { total: 1, _id: 1 },
};

const buildBaseFilter = ({ paymentStatus, paymentMethod, from, to, q }) => {
  const filter = {};
  if (paymentStatus) filter["payment.status"] = paymentStatus;
  if (paymentMethod) filter["payment.method"] = paymentMethod;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00.000${COLOMBO}`);
    if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999${COLOMBO}`);
  }
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    const or = [
      { orderNumber: rx },
      { email: rx },
      { "shippingAddress.fullName": rx },
      { "shippingAddress.phone": rx },
    ];
    const digits = q.replace(/[\s-]/g, "");
    if (digits !== q && digits.length >= 3) {
      or.push({ "shippingAddress.phone": new RegExp(escapeRegex(digits), "i") });
    }
    filter.$or = or;
  }
  return filter;
};

export const listOrders = async ({ page, limit, status, sort, ...filters }) => {
  const base = buildBaseFilter(filters);
  const filter = status ? { ...base, status } : base;
  const [total, docs, countRows] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .select("orderNumber status payment.method payment.status total createdAt email user shippingAddress.fullName items.quantity")
      .lean(),
    Order.aggregate([
      { $match: base },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const counts = Object.fromEntries(ORDER_STATUSES.map((statusName) => [statusName, 0]));
  countRows.forEach((row) => {
    counts[row._id] = row.count;
  });
  const orders = docs.map((order) => ({
    _id: order._id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    customerName: order.shippingAddress?.fullName || "",
    email: order.email,
    isGuest: !order.user,
    itemCount: order.items.reduce((count, item) => count + item.quantity, 0),
    total: order.total,
    status: order.status,
    payment: { method: order.payment?.method, status: order.payment?.status },
  }));

  return {
    orders,
    counts,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};

export const getOrderOrFail = async (orderNumber) => {
  const order = await Order.findOne({ orderNumber });
  if (!order) throw new ApiError(404, "Order not found");
  return order;
};

export const getOrderDetail = async (orderNumber) => {
  const order = await getOrderOrFail(orderNumber);
  let customer = null;
  if (order.user) {
    const [user, ordersCount] = await Promise.all([
      User.findById(order.user).select("name email createdAt isBlocked").lean(),
      Order.countDocuments({ user: order.user }),
    ]);
    if (user) {
      customer = {
        _id: user._id,
        name: user.name,
        email: user.email,
        since: user.createdAt,
        isBlocked: Boolean(user.isBlocked),
        ordersCount,
      };
    }
  }
  return { order, customer };
};
