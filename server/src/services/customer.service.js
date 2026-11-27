import mongoose from "mongoose";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Address from "../models/Address.js";
import { ApiError } from "../utils/ApiError.js";
import { escapeRegex } from "../utils/escapeRegex.js";

const OPEN_STATUSES = ["pending", "processing", "shipped"];

const buildMatch = ({ q, status }) => {
  const match = { role: "customer" };
  if (status === "blocked") match.isBlocked = true;
  if (status === "active") match.isBlocked = { $ne: true };
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    match.$or = [{ name: rx }, { email: rx }];
  }
  return match;
};

const USER_SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  name: { name: 1, _id: 1 },
};
const STAT_SORTS = {
  spent: { totalSpent: -1, _id: -1 },
  orders: { ordersCount: -1, _id: -1 },
};

const statsLookup = {
  $lookup: {
    from: Order.collection.name,
    let: { uid: "$_id" },
    pipeline: [
      { $match: { $expr: { $eq: ["$user", "$$uid"] } } },
      {
        $group: {
          _id: null,
          ordersCount: { $sum: 1 },
          totalSpent: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 0, "$total"] } },
          lastOrderAt: { $max: "$createdAt" },
        },
      },
    ],
    as: "stats",
  },
};

const flatten = {
  $addFields: {
    ordersCount: { $ifNull: [{ $arrayElemAt: ["$stats.ordersCount", 0] }, 0] },
    totalSpent: { $ifNull: [{ $arrayElemAt: ["$stats.totalSpent", 0] }, 0] },
    lastOrderAt: { $ifNull: [{ $arrayElemAt: ["$stats.lastOrderAt", 0] }, null] },
  },
};

const project = {
  $project: {
    name: 1,
    email: 1,
    createdAt: 1,
    isBlocked: 1,
    blockedReason: 1,
    blockedAt: 1,
    ordersCount: 1,
    totalSpent: 1,
    lastOrderAt: 1,
  },
};

export const listCustomers = async ({ page, limit, q, status, sort }) => {
  const match = buildMatch({ q, status });
  const skip = (page - 1) * limit;
  const pipeline = USER_SORTS[sort]
    ? [{ $match: match }, { $sort: USER_SORTS[sort] }, { $skip: skip }, { $limit: limit }, statsLookup, flatten, project]
    : [{ $match: match }, statsLookup, flatten, { $sort: STAT_SORTS[sort] }, { $skip: skip }, { $limit: limit }, project];

  const query = User.aggregate(pipeline);
  if (sort === "name") query.collation({ locale: "en", strength: 2 });
  const [total, customers] = await Promise.all([User.countDocuments(match), query]);
  return { customers, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
};

export const getCustomer = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Customer not found");
  const user = await User.findOne({ _id: id, role: "customer" })
    .select("name email phone createdAt isBlocked blockedReason blockedAt blockedBy addresses")
    .populate({ path: "blockedBy", select: "name" })
    .lean();
  if (!user) throw new ApiError(404, "Customer not found");

  const [row] = await Order.aggregate([
    { $match: { user: user._id } },
    {
      $group: {
        _id: null,
        ordersCount: { $sum: 1 },
        cancelledCount: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        totalSpent: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 0, "$total"] } },
        openOrders: { $sum: { $cond: [{ $in: ["$status", OPEN_STATUSES] }, 1, 0] } },
        lastOrderAt: { $max: "$createdAt" },
      },
    },
  ]);
  const addresses = await Address.find({ user: user._id })
    .sort({ isDefault: -1, createdAt: -1 })
    .select("fullName phone line1 line2 city province postalCode")
    .lean();

  const ordersCount = row?.ordersCount ?? 0;
  const cancelledCount = row?.cancelledCount ?? 0;
  const totalSpent = row?.totalSpent ?? 0;
  const counted = ordersCount - cancelledCount;
  return {
    customer: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      createdAt: user.createdAt,
      isBlocked: Boolean(user.isBlocked),
      blockedReason: user.blockedReason || null,
      blockedAt: user.blockedAt || null,
      blockedBy: user.blockedBy ? { name: user.blockedBy.name } : null,
      addresses,
    },
    stats: {
      ordersCount,
      cancelledCount,
      totalSpent,
      averageOrderValue: counted > 0 ? Math.round((totalSpent / counted) * 100) / 100 : 0,
      openOrders: row?.openOrders ?? 0,
      lastOrderAt: row?.lastOrderAt ?? null,
    },
  };
};

export const listCustomerOrders = async ({ id, page, limit }) => {
  if (!mongoose.isValidObjectId(id) || !(await User.exists({ _id: id, role: "customer" }))) {
    throw new ApiError(404, "Customer not found");
  }
  const filter = { user: id };
  const [total, docs] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit)
      .select("orderNumber status payment.method payment.status total createdAt items.quantity").lean(),
  ]);
  const orders = docs.map((o) => ({
    _id: o._id,
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
    total: o.total,
    status: o.status,
    payment: { method: o.payment?.method, status: o.payment?.status },
  }));
  return { orders, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
};

export const blockCustomer = async ({ actor, targetId, reason }) => {
  if (String(actor._id) === String(targetId)) throw new ApiError(400, "You can't block your own account");
  const updated = await User.findOneAndUpdate(
    { _id: targetId, role: "customer", isBlocked: { $ne: true } },
    { $set: { isBlocked: true, blockedReason: reason, blockedAt: new Date(), blockedBy: actor._id } },
    { new: true }
  ).select("name email isBlocked");

  let user = updated;
  if (!user) {
    user = await User.findOne({ _id: targetId, role: "customer" }).select("name email isBlocked");
    if (!user) throw new ApiError(404, "Customer not found");
  }
  const openOrders = await Order.countDocuments({ user: targetId, status: { $in: OPEN_STATUSES } });
  return { user, changed: Boolean(updated), openOrders };
};

export const unblockCustomer = async ({ targetId }) => {
  const before = await User.findOneAndUpdate(
    { _id: targetId, role: "customer", isBlocked: true },
    { $set: { isBlocked: false }, $unset: { blockedReason: 1, blockedAt: 1, blockedBy: 1 } },
    { new: false }
  ).select("name email blockedReason");
  if (before) {
    return { user: { _id: before._id, name: before.name, email: before.email, isBlocked: false }, changed: true, previousReason: before.blockedReason || null };
  }
  const user = await User.findOne({ _id: targetId, role: "customer" }).select("name email isBlocked");
  if (!user) throw new ApiError(404, "Customer not found");
  return { user, changed: false, previousReason: null };
};
