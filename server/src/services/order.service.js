import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Counter from "../models/Counter.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { formatAttributes, recordMovements } from "./inventory.service.js";
import { ApiError } from "../utils/ApiError.js";
import { createCheckoutQuote } from "./checkout.service.js";
import { enqueueEmail } from "./email.service.js";
import { orderEmailData } from "../emails/orderData.js";

const round2 = (value) => Math.round(value * 100) / 100;

async function nextOrderNumber(session) {
  const counter = await Counter.findOneAndUpdate(
    { _id: "order" },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, session }
  );
  return `ORD-${new Date().getFullYear()}-${String(counter.seq).padStart(6, "0")}`;
}

async function reduceStock(line, session, { orderNumber, userId }) {
  const productId = line.product._id;
  const quantity = line.quantity;
  const activeProduct = { _id: productId, isActive: true, isDeleted: false };
  const filter = line.variantSku
    ? {
        ...activeProduct,
        stock: { $gte: quantity },
        variants: {
          $elemMatch: { sku: line.variantSku, stock: { $gte: quantity } },
        },
      }
    : { ...activeProduct, stock: { $gte: quantity } };
  const update = line.variantSku
    ? {
        $inc: {
          "variants.$.stock": -quantity,
          stock: -quantity,
        },
      }
    : { $inc: { stock: -quantity } };

  const updatedProduct = await Product.findOneAndUpdate(filter, update, {
    new: true,
    session,
  }).select("name sku stock variants");
  if (!updatedProduct) {
    throw new ApiError(
      409,
      `"${line.product.name}" just went out of stock. Please review your cart.`
    );
  }

  const variant = line.variantSku
    ? updatedProduct.variants.find((entry) => entry.sku === line.variantSku)
    : null;
  if (line.variantSku && !variant) {
    throw new ApiError(409, "The selected product variant is no longer available");
  }

  await recordMovements({
    product: updatedProduct,
    entries: [
      {
        sku: variant?.sku || updatedProduct.sku || "",
        label: variant ? formatAttributes(variant.attributes) : "",
        change: -quantity,
        stockAfter: variant ? variant.stock : updatedProduct.stock,
        reason: "sale",
        note: `Order ${orderNumber}`,
      },
    ],
    userId,
    session,
  });
}

function isTransactionUnsupported(error) {
  return (
    error.code === 20 ||
    /Transaction numbers are only allowed|replica set|does not support transactions/i.test(
      error.message
    )
  );
}

function ownsIdempotentOrder(order, userId, email) {
  if (!order) return false;
  if (userId) return order.user?.toString() === userId.toString();
  return !order.user && order.email === email.trim().toLowerCase();
}

export async function placeOrder({ userId, userEmail, body, idempotencyKey }) {
  const email = userId ? userEmail : body.email;
  if (!email) throw new ApiError(400, "Email is required for guest checkout");

  if (idempotencyKey) {
    const existing = await Order.findOne({ idempotencyKey });
    if (existing) {
      if (!ownsIdempotentOrder(existing, userId, email)) {
        throw new ApiError(409, "Idempotency key has already been used for another order");
      }
      return { order: existing, created: false };
    }
  }

  if (userId && body.items && !body.buyNow) {
    throw new ApiError(400, "Authenticated customers use their saved cart");
  }
  if (!userId && !body.items) {
    throw new ApiError(400, "Cart items are required for guest checkout");
  }

  const session = await mongoose.startSession();
  try {
    let order;
    await session.withTransaction(async () => {
      const quote = await createCheckoutQuote(
        userId ? { _id: userId } : null,
        body,
        new Date(),
        session
      );
      if (!quote.pricedLines.length || quote.pricedLines.some((line) => !line.isAvailable)) {
        throw new ApiError(
          409,
          quote.pricedLines.length
            ? "Some items are unavailable or low on stock. Please review your cart."
            : "Your cart is empty"
        );
      }
      if (!quote.canCheckout) {
        throw new ApiError(409, "Your cart cannot be checked out. Please review your cart.");
      }

      const shippingOption = quote.shippingOptions.find(
        (option) => option._id === body.shippingMethodId
      );
      if (!shippingOption) {
        throw new ApiError(400, "Selected delivery method is not available");
      }

      const orderNumber = await nextOrderNumber(session);
      for (const line of quote.pricedLines) {
        await reduceStock(line, session, { orderNumber, userId });
      }

      const orderDocument = {
        orderNumber,
        user: userId || null,
        email,
        items: quote.pricedLines.map((line) => ({
          product: line.product._id,
          name: line.product.name,
          slug: line.product.slug,
          image: line.product.image,
          variantSku: line.variantSku || null,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          lineTotal: line.lineTotal,
        })),
        shippingAddress: {
          fullName: quote.address.fullName,
          phone: quote.address.phone,
          line1: quote.address.line1,
          line2: quote.address.line2 || "",
          city: quote.address.city,
          province: quote.address.province,
          postalCode: quote.address.postalCode,
        },
        shippingMethod: {
          methodId: shippingOption._id,
          name: shippingOption.name,
          price: shippingOption.price,
          etaMin: shippingOption.delivery.minDate,
          etaMax: shippingOption.delivery.maxDate,
        },
        payment: { method: body.paymentMethod, status: "pending" },
        subtotal: quote.totals.subtotal,
        discount: quote.totals.discount || 0,
        shipping: shippingOption.price,
        total: round2(
          quote.totals.subtotal - (quote.totals.discount || 0) + shippingOption.price
        ),
        status: "pending",
        statusHistory: [{ status: "pending", note: "Order placed" }],
      };
      if (idempotencyKey) orderDocument.idempotencyKey = idempotencyKey;

      [order] = await Order.create([orderDocument], { session });
      await enqueueEmail(
        { to: email, template: "orderConfirmation", data: orderEmailData(order) },
        { session }
      );
      if (userId && !body.buyNow) {
        await Cart.updateOne({ user: userId }, { $set: { items: [] } }, { session });
      }
    });

    return { order, created: true };
  } catch (error) {
    if (idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey });
      if (existing && ownsIdempotentOrder(existing, userId, email)) {
        return { order: existing, created: false };
      }
    }
    if (error.code === 11000 && idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey });
      if (existing) {
        if (!ownsIdempotentOrder(existing, userId, email)) {
          throw new ApiError(409, "Idempotency key has already been used for another order");
        }
        return { order: existing, created: false };
      }
    }
    if (isTransactionUnsupported(error)) {
      throw new ApiError(
        503,
        "Order placement requires MongoDB transactions. Configure MongoDB as a replica set."
      );
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
