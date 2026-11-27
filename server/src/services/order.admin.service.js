import mongoose from 'mongoose';
import Order from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';
import { enqueueEmail } from './email.service.js';
import { orderEmailData } from '../emails/orderData.js';
import { restoreStock } from './order.manage.service.js';
import { REQUIRED_CURRENT, CANCELLABLE_BY_ADMIN } from '../constants/orderFlow.js';

const EMAIL_FOR = { shipped: 'orderShipped', delivered: 'orderDelivered' };
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const listAdminOrders = async ({ page, limit, status, search }) => {
  const filter = {};
  if (status) filter.status = status;
  if (search) {
    const expression = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { orderNumber: expression },
      { email: expression },
      { 'shippingAddress.fullName': expression },
    ];
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name email')
      .lean(),
    Order.countDocuments(filter),
  ]);
  return {
    orders,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};

export const updateStatus = async ({ orderNumber, status, note }) => {
  const session = await mongoose.startSession();
  try {
    let result;

    await session.withTransaction(async () => {
      const isCancel = status === 'cancelled';
      const filter = isCancel
        ? { orderNumber, status: { $in: CANCELLABLE_BY_ADMIN } }
        : { orderNumber, status: REQUIRED_CURRENT[status] };

      const set = { status };
      if (isCancel) {
        set.cancelledAt = new Date();
        set.cancelReason = 'store';
        set.cancelNote = note || '';
      }

      const order = await Order.findOneAndUpdate(
        filter,
        {
          $set: set,
          $push: { statusHistory: { status, note: note || (isCancel ? 'Cancelled by store' : '') } },
        },
        { new: true, session }
      );

      if (!order) {
        const current = await Order.findOne({ orderNumber }).select('status').session(session).lean();
        throw current
          ? new ApiError(409, `Cannot change an order from "${current.status}" to "${status}"`)
          : new ApiError(404, 'Order not found');
      }

      if (isCancel) {
        for (const item of order.items) {
          await restoreStock(item, session, { orderNumber });
        }
        if (order.payment.status === 'paid') {
          order.payment.status = 'refund_pending';
          await order.save({ session });
        }
        await enqueueEmail(
          { to: order.email, template: 'orderCancelled', data: orderEmailData(order, { cancelledBy: 'store' }) },
          { session }
        );
      } else if (EMAIL_FOR[status]) {
        await enqueueEmail(
          { to: order.email, template: EMAIL_FOR[status], data: orderEmailData(order) },
          { session }
        );
      }

      result = order;
    });

    return result;
  } finally {
    await session.endSession();
  }
};

export const markCodPaid = async ({ orderNumber }) => {
  const order = await Order.findOneAndUpdate(
    {
      orderNumber,
      'payment.method': 'cod',
      'payment.status': 'pending',
      status: { $in: ['shipped', 'delivered'] },
    },
    { $set: { 'payment.status': 'paid', 'payment.paidAt': new Date() } },
    { new: true }
  );
  if (order) return order;

  const existing = await Order.findOne({ orderNumber });
  if (!existing) throw new ApiError(404, 'Order not found');
  if (existing.payment.method !== 'cod') {
    throw new ApiError(409, 'Only cash-on-delivery orders can be marked as paid manually');
  }
  if (existing.payment.status === 'paid') return existing;
  if (existing.status === 'cancelled') throw new ApiError(409, 'Cancelled orders cannot be marked as paid');
  throw new ApiError(409, 'Mark the order as paid after it has been shipped or delivered');
};
