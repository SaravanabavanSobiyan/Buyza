import { afterAll, beforeAll, beforeEach, describe, expect, test } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import User from "../src/models/User.js";
import Product from "../src/models/Product.js";
import Wishlist from "../src/models/Wishlist.js";

import { startDb, stopDb } from "./helpers.js";
let user;
let otherUser;
let token;
let otherToken;
let productA;
let productB;
let inactiveProduct;

const id = (document) => String(document._id);
const authorize = (req, authToken = token) => req.set("Authorization", `Bearer ${authToken}`);

beforeAll(startDb);
afterAll(stopDb);

beforeEach(async () => {
  await Promise.all([User.deleteMany(), Product.deleteMany(), Wishlist.deleteMany()]);

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

  productA = await Product.create({
    name: "Alpha Shirt",
    slug: "alpha-shirt",
    price: 1500,
    stock: 5,
    isActive: true,
  });
  productB = await Product.create({
    name: "Beta Tee",
    slug: "beta-tee",
    price: 2000,
    stock: 3,
    isActive: true,
  });
  inactiveProduct = await Product.create({
    name: "Gamma Hat",
    slug: "gamma-hat",
    price: 900,
    stock: 4,
    isActive: false,
  });
});

describe("wishlist authentication", () => {
  test("requires authentication", async () => {
    const response = await request(app).get("/api/wishlist");
    expect(response.status).toBe(401);
  });
});

describe("PUT /api/wishlist/:productId", () => {
  test("adds an active product and prevents duplicates", async () => {
    let response = await authorize(request(app).put(`/api/wishlist/${id(productA)}`));
    expect(response.status).toBe(200);
    expect(response.body.saved).toBe(true);

    response = await authorize(request(app).put(`/api/wishlist/${id(productA)}`));
    expect(response.status).toBe(200);
    expect(response.body.saved).toBe(true);
    expect(await Wishlist.countDocuments({ user: user._id })).toBe(1);
  });

  test("rejects inactive products and malformed ids", async () => {
    const inactive = await authorize(request(app).put(`/api/wishlist/${id(inactiveProduct)}`));
    expect(inactive.status).toBe(404);

    const invalid = await authorize(request(app).put("/api/wishlist/not-a-valid-id"));
    expect(invalid.status).toBe(404);

    const unknown = await authorize(request(app).put(`/api/wishlist/${new mongoose.Types.ObjectId()}`));
    expect(unknown.status).toBe(404);
  });

  test("enforces the wishlist item limit", async () => {
    for (let i = 0; i < 200; i += 1) {
      const product = await Product.create({
        name: `Product ${i}`,
        slug: `product-${i}`,
        price: 1000,
        stock: 5,
        isActive: true,
      });
      await authorize(request(app).put(`/api/wishlist/${id(product)}`));
    }

    const response = await authorize(request(app).put(`/api/wishlist/${id(productB)}`));
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/wishlist is full/i);

    const savedItem = await Wishlist.findOne({ user: user._id }).select("product");
    const duplicate = await authorize(request(app).put(`/api/wishlist/${savedItem.product}`));
    expect(duplicate.status).toBe(200);
    expect(await Wishlist.countDocuments({ user: user._id })).toBe(200);
  });

  test("enforces the item limit when simultaneous requests race", async () => {
    const savedProducts = await Product.insertMany(
      Array.from({ length: 199 }, (_, index) => ({
        name: `Saved Product ${index}`,
        slug: `saved-product-${index}`,
        price: 1000,
        stock: 1,
        isActive: true,
      }))
    );
    await Wishlist.insertMany(
      savedProducts.map((product) => ({ user: user._id, product: product._id }))
    );
    await User.updateOne({ _id: user._id }, { $set: { wishlistCount: 199 } });

    const responses = await Promise.all([
      authorize(request(app).put(`/api/wishlist/${id(productA)}`)),
      authorize(request(app).put(`/api/wishlist/${id(productB)}`)),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
    expect(await Wishlist.countDocuments({ user: user._id })).toBe(200);
    expect((await User.findById(user._id).select("+wishlistCount")).wishlistCount).toBe(200);
  });
});

describe("GET /api/wishlist", () => {
  test("lists only the current user's items with pagination metadata", async () => {
    await authorize(request(app).put(`/api/wishlist/${id(productA)}`));
    await authorize(request(app).put(`/api/wishlist/${id(productB)}`));

    const other = await authorize(request(app).put(`/api/wishlist/${id(productA)}`), otherToken);
    expect(other.status).toBe(200);

    const response = await authorize(request(app).get("/api/wishlist"));
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.total).toBe(2);
    expect(response.body.totalPages).toBe(1);
    expect(response.body.items[0].productId).toBe(id(productB));
  });

  test("uses current sale prices for saved simple products", async () => {
    await Product.updateOne({ _id: productA._id }, { salePrice: 1200 });
    await authorize(request(app).put(`/api/wishlist/${id(productA)}`));

    const response = await authorize(request(app).get("/api/wishlist"));
    expect(response.status).toBe(200);
    expect(response.body.items[0].price).toBe(1200);
    expect(response.body.items[0].compareAtPrice).toBe(1500);
  });

  test("paginates wishlist items", async () => {
    const products = await Product.insertMany(
      Array.from({ length: 13 }, (_, index) => ({
        name: `Paged Product ${index}`,
        slug: `paged-product-${index}`,
        price: 1000,
        stock: 2,
        isActive: true,
      }))
    );
    for (const product of products) {
      await authorize(request(app).put(`/api/wishlist/${id(product)}`));
    }

    const firstPage = await authorize(request(app).get("/api/wishlist?page=1&limit=12"));
    expect(firstPage.body.items).toHaveLength(12);
    expect(firstPage.body.total).toBe(13);
    expect(firstPage.body.totalPages).toBe(2);

    const secondPage = await authorize(request(app).get("/api/wishlist?page=2&limit=12"));
    expect(secondPage.body.items).toHaveLength(1);
    expect(secondPage.body.page).toBe(2);
  });

  test("a user cannot remove another user's saved item", async () => {
    await authorize(request(app).put(`/api/wishlist/${id(productA)}`), otherToken);

    const response = await authorize(request(app).delete(`/api/wishlist/${id(productA)}`));
    expect(response.status).toBe(200);
    expect(await Wishlist.exists({ user: otherUser._id, product: productA._id })).toBeTruthy();
  });

  test("removes stale products from the wishlist and keeps pagination safe", async () => {
    await authorize(request(app).put(`/api/wishlist/${id(productA)}`));
    const stale = await Product.create({
      name: "Old Product",
      slug: "old-product",
      price: 1000,
      stock: 2,
      isActive: true,
    });
    await authorize(request(app).put(`/api/wishlist/${id(stale)}`));
    await Product.updateOne({ _id: stale._id }, { isActive: false });

    const response = await authorize(request(app).get("/api/wishlist"));
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].productId).toBe(id(productA));
  });
});

describe("GET /api/wishlist/ids", () => {
  test("returns the current user's saved product ids", async () => {
    await authorize(request(app).put(`/api/wishlist/${id(productA)}`));
    await authorize(request(app).put(`/api/wishlist/${id(productB)}`));

    const response = await authorize(request(app).get("/api/wishlist/ids"));
    expect(response.status).toBe(200);
    expect(response.body.ids).toEqual(expect.arrayContaining([id(productA), id(productB)]));
  });

  test("removes inactive products from wishlist ids", async () => {
    await authorize(request(app).put(`/api/wishlist/${id(productA)}`));
    await Product.updateOne({ _id: productA._id }, { isActive: false });

    const response = await authorize(request(app).get("/api/wishlist/ids"));
    expect(response.status).toBe(200);
    expect(response.body.ids).toEqual([]);
    expect(await Wishlist.countDocuments({ user: user._id })).toBe(0);
  });
});

describe("DELETE /api/wishlist/:productId", () => {
  test("removes a saved item and returns saved false", async () => {
    await authorize(request(app).put(`/api/wishlist/${id(productA)}`));
    const response = await authorize(request(app).delete(`/api/wishlist/${id(productA)}`));
    expect(response.status).toBe(200);
    expect(response.body.saved).toBe(false);
    expect(await Wishlist.countDocuments({ user: user._id })).toBe(0);
  });

  test("accepts deleting a missing item without error", async () => {
    const response = await authorize(request(app).delete(`/api/wishlist/${id(productA)}`));
    expect(response.status).toBe(200);
    expect(response.body.saved).toBe(false);
  });
});
