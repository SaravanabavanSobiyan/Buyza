import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { formatAttributes, recordMovements } from "./inventory.service.js";
import { CANCELLABLE_STATUSES, CANCEL_REASON_LABELS } from "../constants/order.js";
import { ApiError } from "../utils/ApiError.js";
import { enqueueEmail } from "./email.service.js";
import { orderEmailData } from "../emails/orderData.js";

export async function listOrders({ userId, page, limit, status, from, to }) {
  const filter = { user: userId };
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }

  const [total, docs] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select(
        "orderNumber status payment.method payment.status total createdAt items.name items.image items.quantity items.variantSku"
      )
      .lean(),
  ]);

  const orders = docs.map((order) => ({
    _id: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    payment: order.payment,
    total: order.total,
    createdAt: order.createdAt,
    itemCount: order.items.reduce((count, item) => count + item.quantity, 0),
    lineCount: order.items.length,
    preview: order.items.slice(0, 3).map((item) => ({
      name: item.name,
      image: item.image,
      quantity: item.quantity,
      variantSku: item.variantSku,
    })),
  }));

  return {
    orders,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getOrder({ userId, orderNumber }) {
  const order = await Order.findOne({ orderNumber, user: userId });
  if (!order) throw new ApiError(404, "Order not found");
  return order;
}

export const restoreStock = async (item, session, { orderNumber, userId } = {}) => {
  const filter = item.variantSku
    ? { _id: item.product, "variants.sku": item.variantSku }
    : { _id: item.product };
  const update = item.variantSku
    ? {
        $inc: {
          "variants.$.stock": item.quantity,
          stock: item.quantity,
        },
      }
    : { $inc: { stock: item.quantity } };
  const updatedProduct = await Product.findOneAndUpdate(filter, update, {
    new: true,
    session,
  }).select("name sku stock variants");
  if (!updatedProduct) {
    throw new ApiError(
      409,
      `Inventory for "${item.name}" could not be restored. Please contact support.`
    );
  }

  const variant = item.variantSku
    ? updatedProduct.variants.find((entry) => entry.sku === item.variantSku)
    : null;
  if (item.variantSku && !variant) {
    throw new ApiError(
      409,
      `The "${item.name}" variant is no longer available. Please contact support.`
    );
  }

  await recordMovements({
    product: updatedProduct,
    entries: [
      {
        sku: variant?.sku || updatedProduct.sku || "",
        label: variant ? formatAttributes(variant.attributes) : "",
        change: item.quantity,
        stockAfter: variant ? variant.stock : updatedProduct.stock,
        reason: "restock",
        note: orderNumber ? `Cancellation of order ${orderNumber}` : "Cancellation of order",
      },
    ],
    userId,
    session,
  });
};

export async function cancelOrder({ userId, orderNumber, reason, note }) {
  const session = await mongoose.startSession();
  try {
    let result;

    await session.withTransaction(async () => {
      const order = await Order.findOneAndUpdate(
        {
          orderNumber,
          user: userId,
          status: { $in: CANCELLABLE_STATUSES },
        },
        {
          $set: {
            status: "cancelled",
            cancelledAt: new Date(),
            cancelReason: reason,
            cancelNote: note || "",
          },
          $push: {
            statusHistory: {
              status: "cancelled",
              note: `Cancelled by customer (${reason})`,
            },
          },
        },
        { new: true, session }
      );

      if (!order) {
        const exists = await Order.exists({ orderNumber, user: userId }).session(
          session
        );
        throw exists
          ? new ApiError(409, "This order can no longer be cancelled")
          : new ApiError(404, "Order not found");
      }

      for (const item of order.items) {
        await restoreStock(item, session, { orderNumber, userId });
      }

      if (order.payment.status === "paid") {
        order.payment.status = "refund_pending";
        await order.save({ session });
      }

      await enqueueEmail(
        {
          to: order.email,
          template: "orderCancelled",
          data: orderEmailData(order, {
            cancelledBy: "customer",
            reasonLabel: CANCEL_REASON_LABELS[reason] || reason,
          }),
        },
        { session }
      );

      result = order;
    });

    return result;
  } catch (error) {
    if (
      error.code === 20 ||
      /Transaction numbers are only allowed|replica set|does not support transactions/i.test(
        error.message
      )
    ) {
      throw new ApiError(
        503,
        "Order cancellation requires MongoDB transactions. Configure MongoDB as a replica set."
      );
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
