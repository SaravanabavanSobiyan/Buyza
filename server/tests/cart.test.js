import { afterAll, beforeAll, beforeEach, describe, expect, test } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import Cart from "../src/models/Cart.js";
import Product from "../src/models/Product.js";
import User from "../src/models/User.js";

import { startDb, stopDb } from "./helpers.js";
let token;
let simple;
let variant;
let inactive;

const id = (document) => String(document._id);
const authorize = (req) => req.set("Authorization", `Bearer ${token}`);
const addItem = (body) => authorize(request(app).post("/api/cart/items")).send(body);
const getCart = () => authorize(request(app).get("/api/cart"));
const mergeCart = (items) => authorize(request(app).post("/api/cart/merge")).send({ items });
const previewCart = (items) => request(app).post("/api/cart/preview").send({ items });

beforeAll(startDb);
afterAll(stopDb);

beforeEach(async () => {
  await Promise.all([User.deleteMany(), Product.deleteMany(), Cart.deleteMany()]);
  const user = await User.create({
    name: "Test User",
    email: "test@example.com",
    password: "Password123!",
  });
  token = jwt.sign({ sub: id(user) }, process.env.JWT_ACCESS_SECRET);

  simple = await Product.create({
    name: "Plain Tee",
    slug: "plain-tee",
    price: 1000,
    stock: 5,
    isActive: true,
  });
  variant = await Product.create({
    name: "Hoodie",
    slug: "hoodie",
    price: 2000,
    variants: [
      { sku: "RED-M", price: 1500, stock: 3 },
      { sku: "BLUE-L", price: 1600, stock: 0 },
    ],
  });
  inactive = await Product.create({
    name: "Old Cap",
    slug: "old-cap",
    price: 500,
    stock: 10,
    isActive: false,
  });
});

describe("cart authentication", () => {
  test("requires authentication for account carts", async () => {
    const response = await request(app).get("/api/cart");
    expect(response.status).toBe(401);
  });
});

describe("POST /api/cart/items", () => {
  test("adds a simple product and uses database pricing", async () => {
    const response = await addItem({ productId: id(simple), quantity: 2, price: 1 });
    expect(response.status).toBe(201);
    expect(response.body.cart.items).toHaveLength(1);
    expect(response.body.cart.itemCount).toBe(2);
    expect(response.body.cart.subtotal).toBe(2000);
    expect(response.body.cart.items[0].unitPrice).toBe(1000);
  });

  test("uses the selected variant price", async () => {
    const response = await addItem({ productId: id(variant), variantSku: "RED-M", quantity: 2 });
    expect(response.status).toBe(201);
    expect(response.body.cart.items[0].unitPrice).toBe(1500);
    expect(response.body.cart.subtotal).toBe(3000);
  });

  test("combines repeated additions to one cart line", async () => {
    await addItem({ productId: id(simple), quantity: 2 });
    const response = await addItem({ productId: id(simple), quantity: 2 });
    expect(response.body.cart.items).toHaveLength(1);
    expect(response.body.cart.items[0].quantity).toBe(4);
  });

  test("rejects quantities above stock", async () => {
    const response = await addItem({ productId: id(simple), quantity: 6 });
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/Only 5 left/);
  });

  test("rejects a combined quantity above stock", async () => {
    await addItem({ productId: id(simple), quantity: 3 });
    const response = await addItem({ productId: id(simple), quantity: 3 });
    expect(response.status).toBe(400);
  });

  test("requires a selected variant", async () => {
    const response = await addItem({ productId: id(variant), quantity: 1 });
    expect(response.status).toBe(400);
  });

  test("rejects an unknown or out-of-stock variant", async () => {
    const unknown = await addItem({ productId: id(variant), variantSku: "NOPE", quantity: 1 });
    expect(unknown.status).toBe(400);
    const outOfStock = await addItem({ productId: id(variant), variantSku: "BLUE-L", quantity: 1 });
    expect(outOfStock.status).toBe(400);
    expect(outOfStock.body.message).toMatch(/Out of stock/);
  });

  test("rejects inactive products and invalid product ids", async () => {
    expect((await addItem({ productId: id(inactive), quantity: 1 })).status).toBe(404);
    expect((await addItem({ productId: "abc", quantity: 1 })).status).toBe(400);
  });
});

describe("cart item updates and removal", () => {
  test("updates quantity and recalculates totals", async () => {
    const created = await addItem({ productId: id(simple), quantity: 2 });
    const itemId = created.body.cart.items[0]._id;
    const response = await authorize(request(app).patch(`/api/cart/items/${itemId}`)).send({ quantity: 4 });
    expect(response.status).toBe(200);
    expect(response.body.cart.subtotal).toBe(4000);
  });

  test("rejects an update above stock", async () => {
    const created = await addItem({ productId: id(simple), quantity: 2 });
    const itemId = created.body.cart.items[0]._id;
    const response = await authorize(request(app).patch(`/api/cart/items/${itemId}`)).send({ quantity: 6 });
    expect(response.status).toBe(400);
  });

  test("quantity zero removes the item", async () => {
    const created = await addItem({ productId: id(simple), quantity: 2 });
    const itemId = created.body.cart.items[0]._id;
    const response = await authorize(request(app).patch(`/api/cart/items/${itemId}`)).send({ quantity: 0 });
    expect(response.status).toBe(200);
    expect(response.body.cart.items).toHaveLength(0);
  });

  test("removes individual items and clears the cart", async () => {
    const created = await addItem({ productId: id(simple), quantity: 2 });
    let response = await authorize(request(app).delete(`/api/cart/items/${created.body.cart.items[0]._id}`));
    expect(response.body.cart.items).toHaveLength(0);

    await addItem({ productId: id(simple), quantity: 2 });
    response = await authorize(request(app).delete("/api/cart"));
    expect(response.status).toBe(200);
    expect(response.body.cart.total).toBe(0);
  });

  test("returns 404 for an unknown cart item", async () => {
    const itemId = new mongoose.Types.ObjectId().toString();
    const response = await authorize(request(app).patch(`/api/cart/items/${itemId}`)).send({ quantity: 1 });
    expect(response.status).toBe(404);
  });
});

describe("GET /api/cart", () => {
  test("flags items that become understocked", async () => {
    await addItem({ productId: id(simple), quantity: 3 });
    await Product.updateOne({ _id: simple._id }, { stock: 1 });
    const response = await getCart();
    expect(response.body.cart.items[0].isAvailable).toBe(false);
    expect(response.body.cart.subtotal).toBe(0);
    expect(response.body.cart.itemCount).toBe(0);
  });

  test("uses current database prices", async () => {
    await addItem({ productId: id(simple), quantity: 2 });
    await Product.updateOne({ _id: simple._id }, { price: 1200 });
    expect((await getCart()).body.cart.subtotal).toBe(2400);
  });
});

describe("POST /api/cart/preview", () => {
  test("prices guest items from the database without authentication", async () => {
    const response = await previewCart([{ productId: id(simple), variantSku: null, quantity: 2 }]);
    expect(response.status).toBe(200);
    expect(response.body.cart.subtotal).toBe(2000);
    expect(response.body.cart.items[0]._id).toBe(`${id(simple)}__none`);
  });

  test("marks variant products without a selected variant unavailable", async () => {
    const response = await previewCart([{ productId: id(variant), variantSku: null, quantity: 1 }]);
    expect(response.body.cart.items[0].isAvailable).toBe(false);
    expect(response.body.cart.subtotal).toBe(0);
  });

  test("drops products that no longer exist", async () => {
    const missingId = new mongoose.Types.ObjectId().toString();
    const response = await previewCart([{ productId: missingId, variantSku: null, quantity: 1 }]);
    expect(response.body.cart.items).toHaveLength(0);
  });

  test("merges duplicate preview lines and caps their combined quantity", async () => {
    const response = await previewCart([
      { productId: id(simple), variantSku: null, quantity: 6 },
      { productId: id(simple), variantSku: null, quantity: 6 },
    ]);
    expect(response.body.cart.items).toHaveLength(1);
    expect(response.body.cart.items[0].quantity).toBe(10);
    expect(response.body.cart.items[0].isAvailable).toBe(false);
  });

  test("rejects invalid guest cart bodies", async () => {
    const response = await previewCart([{ productId: "invalid", quantity: 1 }]);
    expect(response.status).toBe(400);
  });
});

describe("POST /api/cart/merge", () => {
  test("requires authentication", async () => {
    const response = await request(app).post("/api/cart/merge").send({
      items: [{ productId: id(simple), variantSku: null, quantity: 1 }],
    });
    expect(response.status).toBe(401);
  });

  test("merges guest lines and adds duplicate quantities", async () => {
    await addItem({ productId: id(simple), quantity: 2 });
    const response = await mergeCart([
      { productId: id(simple), variantSku: null, quantity: 2 },
      { productId: id(variant), variantSku: "RED-M", quantity: 1 },
    ]);
    expect(response.status).toBe(200);
    expect(response.body.cart.items).toHaveLength(2);
    expect(response.body.cart.subtotal).toBe(5500);
    expect(response.body.notes).toHaveLength(0);
  });

  test("caps merged quantities to stock and reports skipped unavailable items", async () => {
    const response = await mergeCart([
      { productId: id(simple), variantSku: null, quantity: 10 },
      { productId: id(variant), variantSku: "BLUE-L", quantity: 1 },
    ]);
    expect(response.body.cart.items).toHaveLength(1);
    expect(response.body.cart.items[0].quantity).toBe(5);
    expect(response.body.notes).toHaveLength(2);
    expect(response.body.notes[0]).toMatch(/reduced to 5/);
    expect(response.body.notes[1]).toMatch(/out of stock/);
  });
});
