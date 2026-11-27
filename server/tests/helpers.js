import crypto from "node:crypto";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import Order from "../src/models/Order.js";
import Product from "../src/models/Product.js";
import Category from "../src/models/Category.js";

let orderSeq = 0;
let productSeq = 0;

const dbNameForThisFile = () => {
  const path = globalThis.expect?.getState?.().testPath ?? String(Math.random());
  return `t_${crypto.createHash("md5").update(path).digest("hex").slice(0, 12)}`;
};

export const startDb = async () => {
  const uri = process.env.MONGO_URL_TEST;
  if (!uri) throw new Error("MONGO_URL_TEST is not set. Run tests through jest.config.js.");
  await mongoose.connect(uri, { dbName: dbNameForThisFile() });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
};

export const stopDb = async () => {
  try {
    await mongoose.connection.dropDatabase();
  } finally {
    await mongoose.disconnect();
  }
};

export const sign = (user) => jwt.sign({ sub: String(user._id) }, process.env.JWT_ACCESS_SECRET);
export const as = (token, req) => req.set("Authorization", `Bearer ${token}`);
export const idempotencyKey = () => `key-${crypto.randomUUID()}`;

export const makeUser = (overrides = {}) =>
  User.create({ name: "Test User", email: "test@example.com", password: "Password123!", ...overrides });

export const makeCategory = (name = "Shirts", extra = {}) =>
  Category.create({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), isActive: true, ...extra });

export const makeProduct = (overrides = {}) => {
  const n = ++productSeq;
  return Product.create({ name: `Product ${n}`, slug: `product-${n}`, price: 1000, stock: 10, isActive: true, ...overrides });
};

export const makeOrder = ({ user, product, ...overrides } = {}) =>
  Order.create({
    orderNumber: `ORD-2026-${String(++orderSeq).padStart(6, "0")}`,
    user: user?._id ?? null,
    email: user?.email ?? "guest@example.com",
    items: [{ product: product._id, name: product.name, unitPrice: 1000, quantity: 2, lineTotal: 2000 }],
    shippingAddress: { fullName: "Test User", phone: "0771234567", line1: "12 Galle Road", city: "Colombo", province: "Western Province", postalCode: "00300" },
    shippingMethod: { methodId: "standard", name: "Standard", price: 350 },
    payment: { method: "cod", status: "pending" },
    subtotal: 2000,
    shipping: 350,
    total: 2350,
    status: "pending",
    statusHistory: [{ status: "pending", note: "Order placed" }],
    ...overrides,
  });
