import { afterAll, beforeAll, beforeEach, describe, expect, test } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import Order from "../src/models/Order.js";
import EmailJob from "../src/models/EmailJob.js";
import Product from "../src/models/Product.js";
import StockMovement from "../src/models/StockMovement.js";
import User from "../src/models/User.js";

import { startDb, stopDb } from "./helpers.js";
let user;
let otherUser;
let token;
let otherToken;
let product;
let orderSequence;

const auth = (value, req) => req.set("Authorization", `Bearer ${value}`);
const id = (document) => document._id.toString();

async function createOrder(owner = user, overrides = {}) {
  orderSequence += 1;
  return Order.create({
    orderNumber: `ORD-2026-${String(orderSequence).padStart(6, "0")}`,
    user: owner._id,
    email: owner.email,
    items: [
      {
        product: product._id,
        name: "Plain Tee",
        slug: "plain-tee",
        unitPrice: 1000,
        quantity: 2,
        lineTotal: 2000,
      },
    ],
    shippingAddress: {
      fullName: "Test User",
      phone: "0771234567",
      line1: "12 Galle Road",
      city: "Colombo",
      province: "Western Province",
      postalCode: "00300",
    },
    shippingMethod: { methodId: "standard", name: "Standard", price: 350 },
    payment: { method: "cod", status: "pending" },
    subtotal: 2000,
    shipping: 350,
    total: 2350,
    status: "pending",
    statusHistory: [{ status: "pending", note: "Order placed" }],
    ...overrides,
  });
}

beforeAll(startDb);
afterAll(stopDb);

beforeEach(async () => {
  await Promise.all([
    User.deleteMany(),
    Product.deleteMany(),
    Order.deleteMany(),
    EmailJob.deleteMany(),
    StockMovement.deleteMany(),
  ]);
  user = await User.create({
    name: "Test User",
    email: "test@example.com",
    password: "Password123!",
  });
  otherUser = await User.create({
    name: "Other User",
    email: "other@example.com",
    password: "Password123!",
  });
  token = jwt.sign({ sub: id(user) }, process.env.JWT_ACCESS_SECRET);
  otherToken = jwt.sign({ sub: id(otherUser) }, process.env.JWT_ACCESS_SECRET);
  product = await Product.create({
    name: "Plain Tee",
    slug: "plain-tee",
    price: 1000,
    stock: 3,
    isActive: true,
  });
  orderSequence = 0;
});

describe("customer order management", () => {
  test("lists only the customer's matching orders with pagination", async () => {
    await createOrder(user, {
      status: "cancelled",
      createdAt: new Date("2026-11-05T12:00:00.000Z"),
    });
    await createOrder(user, {
      status: "pending",
      createdAt: new Date("2026-11-20T12:00:00.000Z"),
    });
    await createOrder(otherUser, {
      status: "cancelled",
      createdAt: new Date("2026-11-05T12:00:00.000Z"),
    });

    const paginated = await auth(token, request(app).get("/api/orders?limit=1"));
    expect(paginated.status).toBe(200);
    expect(paginated.body.total).toBe(2);
    expect(paginated.body.orders).toHaveLength(1);
    expect(paginated.body.totalPages).toBe(2);

    const filtered = await auth(
      token,
      request(app).get(
        "/api/orders?status=cancelled&from=2026-11-01&to=2026-11-30"
      )
    );
    expect(filtered.status).toBe(200);
    expect(filtered.body.total).toBe(1);
    expect(filtered.body.orders[0].status).toBe("cancelled");
  });

  test("rejects invalid date filters", async () => {
    const response = await auth(
      token,
      request(app).get("/api/orders?from=2026-02-30")
    );
    expect(response.status).toBe(400);
  });

  test("another customer's order is not discoverable", async () => {
    const order = await createOrder();
    const response = await auth(
      otherToken,
      request(app).get(`/api/orders/${order.orderNumber}`)
    );
    expect(response.status).toBe(404);
  });

  test("cancelling restores inventory and marks the order cancelled", async () => {
    const order = await createOrder();
    const response = await auth(
      token,
      request(app).post(`/api/orders/${order.orderNumber}/cancel`)
    ).send({ reason: "changed_mind" });

    expect(response.status).toBe(200);
    expect(response.body.order).toMatchObject({
      status: "cancelled",
      canCancel: false,
      cancelReason: "changed_mind",
    });
    expect(response.body.order.cancelledAt).toBeTruthy();
    expect((await Product.findById(product._id)).stock).toBe(5);
    const movements = await StockMovement.find({ product: product._id }).lean();
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      change: 2,
      stockAfter: 5,
      reason: "restock",
      note: `Cancellation of order ${order.orderNumber}`,
      user: user._id,
    });
  });

  test("cancelling restores both variant and aggregate inventory", async () => {
    const variantProduct = await Product.create({
      name: "Variant Tee",
      slug: "variant-tee",
      price: 1000,
      stock: 1,
      variants: [{ sku: "TEE-M", stock: 1 }],
      isActive: true,
    });
    const order = await createOrder(user, {
      items: [
        {
          product: variantProduct._id,
          name: "Variant Tee",
          variantSku: "TEE-M",
          unitPrice: 1000,
          quantity: 2,
          lineTotal: 2000,
        },
      ],
    });
    const response = await auth(
      token,
      request(app).post(`/api/orders/${order.orderNumber}/cancel`)
    ).send({ reason: "changed_mind" });

    expect(response.status).toBe(200);
    const restoredProduct = await Product.findById(variantProduct._id);
    expect(restoredProduct.stock).toBe(3);
    expect(restoredProduct.variants[0].stock).toBe(3);
    const movement = await StockMovement.findOne({
      product: variantProduct._id,
    }).lean();
    expect(movement).toMatchObject({
      sku: "TEE-M",
      change: 2,
      stockAfter: 3,
      reason: "restock",
    });
  });

  test("cancelling twice returns a conflict and restores inventory once", async () => {
    const order = await createOrder();
    const url = `/api/orders/${order.orderNumber}/cancel`;
    await auth(token, request(app).post(url)).send({ reason: "changed_mind" });

    const secondResponse = await auth(token, request(app).post(url)).send({
      reason: "changed_mind",
    });

    expect(secondResponse.status).toBe(409);
    expect((await Product.findById(product._id)).stock).toBe(5);
    expect(await StockMovement.countDocuments({ product: product._id })).toBe(1);
  });

  test("does not cancel when the ordered variant can no longer be restocked", async () => {
    const variantProduct = await Product.create({
      name: "Variant Tee",
      slug: "variant-tee",
      price: 1000,
      stock: 1,
      variants: [{ sku: "TEE-M", stock: 1 }],
      isActive: true,
    });
    const order = await createOrder(user, {
      items: [
        {
          product: variantProduct._id,
          name: "Variant Tee",
          variantSku: "TEE-M",
          unitPrice: 1000,
          quantity: 2,
          lineTotal: 2000,
        },
      ],
    });
    await Product.updateOne(
      { _id: variantProduct._id },
      { $set: { variants: [], stock: 0 } }
    );

    const response = await auth(
      token,
      request(app).post(`/api/orders/${order.orderNumber}/cancel`)
    ).send({ reason: "changed_mind" });

    expect(response.status).toBe(409);
    expect((await Order.findById(order._id)).status).toBe("pending");
    expect(await StockMovement.countDocuments()).toBe(0);
  });

  test("validates cancellation reasons and hides other customers' orders", async () => {
    const order = await createOrder();
    const invalid = await auth(
      token,
      request(app).post(`/api/orders/${order.orderNumber}/cancel`)
    ).send({ reason: "not_a_reason" });
    expect(invalid.status).toBe(400);

    const otherCustomer = await auth(
      otherToken,
      request(app).post(`/api/orders/${order.orderNumber}/cancel`)
    ).send({ reason: "changed_mind" });
    expect(otherCustomer.status).toBe(404);
    expect((await Order.findById(order._id)).status).toBe("pending");
    expect((await Product.findById(product._id)).stock).toBe(3);
  });

  test("allows cancellation while processing and records a status timeline entry", async () => {
    const order = await createOrder(user, { status: "processing" });
    const response = await auth(
      token,
      request(app).post(`/api/orders/${order.orderNumber}/cancel`)
    ).send({ reason: "delivery_too_slow", note: "  Please cancel.  " });

    expect(response.status).toBe(200);
    expect(response.body.order.cancelNote).toBe("Please cancel.");
    expect(response.body.order.statusHistory.at(-1)).toMatchObject({
      status: "cancelled",
      note: "Cancelled by customer (delivery_too_slow)",
    });
  });

  test("a shipped order cannot be cancelled", async () => {
    const order = await createOrder(user, { status: "shipped" });
    const response = await auth(
      token,
      request(app).post(`/api/orders/${order.orderNumber}/cancel`)
    ).send({ reason: "changed_mind" });

    expect(response.status).toBe(409);
    expect((await Product.findById(product._id)).stock).toBe(3);
  });

  test("paid online cancellations are flagged for a future refund", async () => {
    const order = await createOrder(user, {
      payment: { method: "cod", status: "paid" },
    });
    const response = await auth(
      token,
      request(app).post(`/api/orders/${order.orderNumber}/cancel`)
    ).send({ reason: "other", note: "Please cancel" });

    expect(response.status).toBe(200);
    expect(response.body.order.payment.status).toBe("refund_pending");
  });

  test("invoice downloads as a PDF", async () => {
    const order = await createOrder();
    const response = await auth(
      token,
      request(app).get(`/api/orders/${order.orderNumber}/invoice`)
    );

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/application\/pdf/);
    expect(response.headers["content-disposition"]).toContain(
      `invoice-${order.orderNumber}.pdf`
    );
    expect(response.body.subarray(0, 5).toString()).toBe("%PDF-");
  });
});

describe("admin order status and payment", () => {
  let adminToken;

  beforeEach(async () => {
    const admin = await User.create({
      name: "Store Admin",
      email: "admin@example.com",
      password: "Password123!",
      role: "admin",
    });
    adminToken = jwt.sign({ sub: id(admin) }, process.env.JWT_ACCESS_SECRET);
  });

  test("admin cancellation requires a reason and exposes the next actions", async () => {
    const order = await createOrder();
    const path = `/api/admin/orders/${order.orderNumber}`;

    const missingReason = await auth(
      adminToken,
      request(app).patch(`${path}/status`)
    ).send({ status: "cancelled", note: "ab" });
    expect(missingReason.status).toBe(400);

    const detail = await auth(adminToken, request(app).get(path));
    expect(detail.status).toBe(200);
    expect(detail.body.order.allowedTransitions).toEqual(["processing", "cancelled"]);

    const packingSlip = await auth(
      adminToken,
      request(app).get(`${path}/packing-slip`)
    );
    expect(packingSlip.status).toBe(200);
    expect(packingSlip.headers["content-type"]).toMatch(/application\/pdf/);
  });

  test("requires an admin and rejects status jumps", async () => {
    const order = await createOrder();
    const path = `/api/admin/orders/${order.orderNumber}/status`;

    const forbidden = await auth(token, request(app).patch(path)).send({
      status: "processing",
    });
    const invalidJump = await auth(adminToken, request(app).patch(path)).send({
      status: "delivered",
    });

    expect(forbidden.status).toBe(403);
    expect(invalidJump.status).toBe(409);
    expect((await Order.findById(order._id)).status).toBe("pending");
    expect(await EmailJob.countDocuments()).toBe(0);
  });

  test("queues shipped and delivered notifications and unlocks reviews", async () => {
    const order = await createOrder();
    const path = `/api/admin/orders/${order.orderNumber}/status`;

    for (const status of ["processing", "shipped", "delivered"]) {
      const response = await auth(adminToken, request(app).patch(path)).send({
        status,
      });
      expect(response.status).toBe(200);
      expect(response.body.order.status).toBe(status);
    }

    const jobs = await EmailJob.find().sort({ template: 1 }).lean();
    expect(jobs.map((job) => job.template)).toEqual([
      "orderDelivered",
      "orderShipped",
    ]);
    const eligibility = await auth(
      token,
      request(app).get(`/api/products/${id(product)}/reviews/eligibility`)
    );
    expect(eligibility.body).toMatchObject({ canReview: true, reason: null });
  });

  test("marks a shipped COD order as paid idempotently and rejects cancelled orders", async () => {
    const shippedOrder = await createOrder(user, { status: "shipped" });
    const paidUrl = `/api/admin/orders/${shippedOrder.orderNumber}/mark-paid`;

    const first = await auth(adminToken, request(app).post(paidUrl));
    const second = await auth(adminToken, request(app).post(paidUrl));
    expect(first.status).toBe(200);
    expect(first.body.order.payment.status).toBe("paid");
    expect(first.body.order.payment.paidAt).toBeTruthy();
    expect(second.status).toBe(200);
    expect(second.body.order.payment.paidAt).toBe(first.body.order.payment.paidAt);

    const cancelled = await createOrder(user, { status: "cancelled" });
    const rejected = await auth(
      adminToken,
      request(app).post(`/api/admin/orders/${cancelled.orderNumber}/mark-paid`)
    );
    expect(rejected.status).toBe(409);
  });
});
