import { afterAll, beforeAll, beforeEach, describe, expect, test } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import Address from "../src/models/Address.js";
import Cart from "../src/models/Cart.js";
import Order from "../src/models/Order.js";
import EmailJob from "../src/models/EmailJob.js";
import Product from "../src/models/Product.js";
import StockMovement from "../src/models/StockMovement.js";
import ShippingMethod from "../src/models/ShippingMethod.js";
import User from "../src/models/User.js";

import { startDb, stopDb } from "./helpers.js";
let token;
let user;
let product;
let shippingMethod;

const id = (document) => String(document._id);
const auth = (req) => req.set("Authorization", `Bearer ${token}`);
const address = {
  fullName: "Test User",
  phone: "0771234567",
  line1: "12 Galle Road",
  line2: "",
  city: "Colombo",
  province: "Western Province",
  postalCode: "00300",
  country: "Sri Lanka",
};

const placeAccountOrder = (key, extra = {}) =>
  auth(request(app).post("/api/orders"))
    .set("Idempotency-Key", key)
    .send({
      address,
      shippingMethodId: id(shippingMethod),
      paymentMethod: "cod",
      ...extra,
    });

beforeAll(startDb);
afterAll(stopDb);

beforeEach(async () => {
  await Promise.all([
    User.deleteMany(),
    Address.deleteMany(),
    Product.deleteMany(),
    Cart.deleteMany(),
    Order.deleteMany(),
    EmailJob.deleteMany(),
    StockMovement.deleteMany(),
    ShippingMethod.deleteMany(),
  ]);
  user = await User.create({
    name: "Test User",
    email: "test@example.com",
    password: "Password123!",
  });
  token = jwt.sign({ sub: id(user) }, process.env.JWT_ACCESS_SECRET);
  product = await Product.create({
    name: "Plain Tee",
    slug: "plain-tee",
    price: 1000,
    stock: 5,
    isActive: true,
  });
  shippingMethod = await ShippingMethod.create({
    code: "standard",
    name: "Standard",
    minDeliveryDays: 3,
    maxDeliveryDays: 5,
    flatPrice: 300,
    isActive: true,
  });
  await Cart.create({
    user: user._id,
    items: [{ product: product._id, quantity: 2, priceSnapshot: 1000 }],
  });
});

describe("POST /api/orders", () => {
  test("creates a COD order, reduces stock and clears the account cart", async () => {
    const response = await placeAccountOrder("order-create-123456");

    expect(response.status).toBe(201);
    expect(response.body.order.orderNumber).toMatch(/^ORD-\d{4}-\d{6}$/);
    expect(response.body.order.items[0]).toMatchObject({
      name: "Plain Tee",
      unitPrice: 1000,
      quantity: 2,
      lineTotal: 2000,
    });
    expect(response.body.order.payment).toMatchObject({ method: "cod", status: "pending" });
    expect(response.body.order.status).toBe("pending");
    expect(response.body.order.idempotencyKey).toBeUndefined();
    expect(await StockMovement.findOne({ product: product._id }).lean()).toMatchObject({
      change: -2,
      stockAfter: 3,
      reason: "sale",
      note: `Order ${response.body.order.orderNumber}`,
      user: user._id,
    });
    expect((await Product.findById(product._id)).stock).toBe(3);
    expect((await Cart.findOne({ user: user._id })).items).toHaveLength(0);
    expect(await EmailJob.countDocuments({ template: "orderConfirmation" })).toBe(1);
  });

  test("cancels a placed order and records a matching stock reversal", async () => {
    const placed = await placeAccountOrder("order-cancel-real-123");
    expect(placed.status).toBe(201);
    expect((await Product.findById(product._id)).stock).toBe(3);

    const cancelled = await auth(
      request(app).post(`/api/orders/${placed.body.order.orderNumber}/cancel`)
    ).send({ reason: "changed_mind" });

    expect(cancelled.status).toBe(200);
    expect(cancelled.body.order.status).toBe("cancelled");
    expect(await EmailJob.countDocuments({ template: "orderCancelled" })).toBe(1);
    expect((await Product.findById(product._id)).stock).toBe(5);
    const movements = await StockMovement.find({ product: product._id })
      .sort({ stockAfter: 1 })
      .lean();
    expect(movements).toHaveLength(2);
    expect(
      movements.map(({ reason, change, stockAfter }) => ({
        reason,
        change,
        stockAfter,
      }))
    ).toEqual([
      { reason: "sale", change: -2, stockAfter: 3 },
      { reason: "restock", change: 2, stockAfter: 5 },
    ]);
  });

  test("uses current product prices and creates only one order for a retried key", async () => {
    await Product.updateOne({ _id: product._id }, { price: 1250 });

    const first = await placeAccountOrder("order-retry-123456");
    const retry = await placeAccountOrder("order-retry-123456");

    expect(first.status).toBe(201);
    expect(retry.status).toBe(200);
    expect(retry.body.order.orderNumber).toBe(first.body.order.orderNumber);
    expect(retry.body.order.items[0].unitPrice).toBe(1250);
    expect(await Order.countDocuments()).toBe(1);
    expect(await EmailJob.countDocuments({ template: "orderConfirmation" })).toBe(1);
    expect((await Product.findById(product._id)).stock).toBe(3);
  });

  test("does not expose an order when another customer reuses its idempotency key", async () => {
    const first = await placeAccountOrder("shared-order-key-123");
    const anotherUser = await User.create({
      name: "Another User",
      email: "another@example.com",
      password: "Password123!",
    });
    const anotherToken = jwt.sign(
      { sub: id(anotherUser) },
      process.env.JWT_ACCESS_SECRET
    );
    const retry = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${anotherToken}`)
      .set("Idempotency-Key", "shared-order-key-123")
      .send({
        address,
        shippingMethodId: id(shippingMethod),
        paymentMethod: "cod",
      });

    expect(first.status).toBe(201);
    expect(retry.status).toBe(409);
    expect(retry.body.order).toBeUndefined();
    expect(await Order.countDocuments()).toBe(1);
    expect((await Product.findById(product._id)).stock).toBe(3);
  });

  test("rejects a cart that became understocked without changing stock or creating an order", async () => {
    await Product.updateOne({ _id: product._id }, { stock: 1 });

    const response = await placeAccountOrder("order-stock-fail-123");

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/unavailable|stock/i);
    expect(await Order.countDocuments()).toBe(0);
    expect((await Product.findById(product._id)).stock).toBe(1);
    expect((await Cart.findOne({ user: user._id })).items).toHaveLength(1);
  });

  test("allows a guest to place an order with a valid email", async () => {
    const guestBody = {
      address,
      email: "guest@example.com",
      items: [{ productId: id(product), variantSku: null, quantity: 1 }],
      shippingMethodId: id(shippingMethod),
      paymentMethod: "cod",
    };
    const response = await request(app)
      .post("/api/orders")
      .set("Idempotency-Key", "order-guest-123456")
      .send(guestBody);

    expect(response.status).toBe(201);
    expect(await Order.countDocuments()).toBe(1);
    expect((await Product.findById(product._id)).stock).toBe(4);
  });

  test("Buy now orders only the requested item and preserves the account cart", async () => {
    const buyNowProduct = await Product.create({
      name: "Canvas Bag",
      slug: "canvas-bag",
      price: 2500,
      stock: 4,
      isActive: true,
    });
    const items = [{ productId: id(buyNowProduct), variantSku: null, quantity: 1 }];
    const quoteResponse = await auth(request(app).post("/api/checkout/quote")).send({
      address,
      items,
      buyNow: true,
    });
    expect(quoteResponse.status).toBe(200);
    expect(quoteResponse.body.quote.pricedLines).toHaveLength(1);
    expect(quoteResponse.body.quote.pricedLines[0].product.name).toBe("Canvas Bag");

    const orderResponse = await auth(request(app).post("/api/orders"))
      .set("Idempotency-Key", "order-buy-now-12345")
      .send({
        address,
        items,
        buyNow: true,
        shippingMethodId: id(shippingMethod),
        paymentMethod: "cod",
      });

    expect(orderResponse.status).toBe(201);
    expect(orderResponse.body.order.items).toHaveLength(1);
    expect(orderResponse.body.order.items[0].name).toBe("Canvas Bag");
    expect((await Product.findById(buyNowProduct._id)).stock).toBe(3);
    const cart = await Cart.findOne({ user: user._id });
    expect(cart.items).toHaveLength(1);
    expect(String(cart.items[0].product)).toBe(id(product));
    expect((await Product.findById(product._id)).stock).toBe(5);
  });

  test("accepts an owned saved address ID and rejects an unknown payment method", async () => {
    const savedAddress = await Address.create({ ...address, user: user._id });
    const response = await placeAccountOrder("order-saved-address-123", {
      address: undefined,
      addressId: id(savedAddress),
    });
    expect(response.status).toBe(201);
    expect(response.body.order.shippingAddress.line1).toBe(address.line1);

    const unknownPayment = await auth(request(app).post("/api/orders"))
      .set("X-Forwarded-For", "203.0.113.42")
      .send({
        address,
        shippingMethodId: id(shippingMethod),
        paymentMethod: "bitcoin",
      });
    expect(unknownPayment.status).toBe(400);
  });
});
