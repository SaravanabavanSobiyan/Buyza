import { afterAll, beforeAll, beforeEach, describe, expect, test } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import Order from "../src/models/Order.js";
import Product from "../src/models/Product.js";
import Review from "../src/models/Review.js";
import User from "../src/models/User.js";

import { startDb, stopDb } from "./helpers.js";
let product;
let user;
let otherUser;
let token;
let otherToken;
let orderNumber;

const id = (document) => String(document._id);
const auth = (accessToken, req) => req.set("Authorization", `Bearer ${accessToken}`);
const reviewUrl = (suffix = "") => `/api/products/${id(product)}/reviews${suffix}`;
const reviewPayload = { rating: 5, title: "Great quality", body: "Really good quality, would buy again." };
const submitReview = (accessToken, payload = reviewPayload) =>
  auth(accessToken, request(app).post(reviewUrl())).send(payload);

const createOrder = (owner, status = "delivered") =>
  Order.create({
    orderNumber: `ORD-2026-${String(++orderNumber).padStart(6, "0")}`,
    user: owner._id,
    email: owner.email,
    items: [
      {
        product: product._id,
        name: product.name,
        unitPrice: 1000,
        quantity: 1,
        lineTotal: 1000,
      },
    ],
    shippingAddress: {
      fullName: owner.name,
      phone: "0771234567",
      line1: "12 Galle Road",
      city: "Colombo",
      province: "Western Province",
      postalCode: "00300",
    },
    shippingMethod: { methodId: "standard", name: "Standard", price: 0 },
    payment: { method: "cod", status: "pending" },
    subtotal: 1000,
    shipping: 0,
    total: 1000,
    status,
  });

beforeAll(async () => {
  await startDb();
  await Review.syncIndexes();
});
afterAll(stopDb);

beforeEach(async () => {
  orderNumber = 0;
  await Promise.all([Order.deleteMany(), Product.deleteMany(), Review.deleteMany(), User.deleteMany()]);
  user = await User.create({ name: "Nimal Perera", email: "nimal@example.com", password: "Password123!" });
  otherUser = await User.create({ name: "Kamala Silva", email: "kamala@example.com", password: "Password123!" });
  token = jwt.sign({ sub: id(user) }, process.env.JWT_ACCESS_SECRET);
  otherToken = jwt.sign({ sub: id(otherUser) }, process.env.JWT_ACCESS_SECRET);
  product = await Product.create({ name: "Plain Tee", slug: "plain-tee", price: 1000, stock: 5 });
});

describe("review eligibility and writes", () => {
  test("requires a delivered purchase and permits eligible buyers", async () => {
    expect((await submitReview(token)).status).toBe(403);
    await createOrder(user, "pending");
    expect((await submitReview(token)).status).toBe(403);

    await createOrder(user);
    expect((await submitReview(token)).status).toBe(201);
  });

  test("enforces one review per user and validates ratings and body length", async () => {
    await createOrder(user);
    for (const rating of [0, 6, 3.5, "invalid"]) {
      expect((await submitReview(token, { ...reviewPayload, rating })).status).toBe(400);
    }
    expect((await submitReview(token, { ...reviewPayload, body: "Too short" })).status).toBe(400);
    expect((await submitReview(token)).status).toBe(201);
    expect((await submitReview(token)).status).toBe(409);
    expect(await Review.countDocuments()).toBe(1);
  });

  test("reports eligibility and requires authentication for writes", async () => {
    expect((await request(app).post(reviewUrl()).send(reviewPayload)).status).toBe(401);
    let response = await auth(token, request(app).get(reviewUrl("/eligibility")));
    expect(response.body).toMatchObject({ canReview: false, reason: "not_purchased" });

    await createOrder(user);
    response = await auth(token, request(app).get(reviewUrl("/eligibility")));
    expect(response.body).toMatchObject({ canReview: true, reason: null });
  });
});

describe("review summaries and ownership", () => {
  test("recalculates the stored average and breakdown after create, edit and delete", async () => {
    await createOrder(user);
    await createOrder(otherUser);
    await submitReview(token, { ...reviewPayload, rating: 5 });
    const second = await submitReview(otherToken, { ...reviewPayload, rating: 3 });

    let stored = await Product.findById(product._id).lean();
    expect(stored.ratingAvg).toBe(4);
    expect(stored.ratingCount).toBe(2);
    expect(stored.ratingBreakdown).toMatchObject({ 3: 1, 5: 1, 1: 0 });

    const edited = await auth(
      otherToken,
      request(app).patch(reviewUrl(`/${second.body.review._id}`))
    ).send({ ...reviewPayload, rating: 1 });
    expect(edited.status).toBe(200);
    stored = await Product.findById(product._id).lean();
    expect(stored.ratingAvg).toBe(3);

    const deleted = await auth(
      token,
      request(app).delete(reviewUrl(`/${(await Review.findOne({ user: user._id }))._id}`))
    );
    expect(deleted.status).toBe(200);
    stored = await Product.findById(product._id).lean();
    expect(stored.ratingAvg).toBe(1);
    expect(stored.ratingCount).toBe(1);
  });

  test("lists publicly with sorting and pagination without exposing email", async () => {
    await createOrder(user);
    await createOrder(otherUser);
    const first = await submitReview(token, { ...reviewPayload, rating: 5 });
    const second = await submitReview(otherToken, { ...reviewPayload, rating: 2 });
    await Review.updateOne({ _id: first.body.review._id }, { createdAt: new Date("2026-01-01") });
    await Review.updateOne({ _id: second.body.review._id }, { createdAt: new Date("2026-02-01") });

    const newest = await request(app).get(reviewUrl("?sort=newest"));
    const highest = await request(app).get(reviewUrl("?sort=highest"));
    const lowest = await request(app).get(reviewUrl("?sort=lowest"));
    const page = await request(app).get(reviewUrl("?limit=1&page=2"));

    expect(newest.status).toBe(200);
    expect(newest.body.reviews[0].rating).toBe(2);
    expect(highest.body.reviews[0].rating).toBe(5);
    expect(lowest.body.reviews[0].rating).toBe(2);
    expect(page.body).toMatchObject({ total: 2, page: 2, totalPages: 2 });
    expect(page.body.reviews).toHaveLength(1);
    expect(newest.body.reviews.map((review) => review.author)).toEqual(
      expect.arrayContaining(["Nimal P.", "Kamala S."])
    );
    expect(JSON.stringify(newest.body)).not.toMatch(/@example\.com/);
  });

  test("does not allow users to edit or delete another customer's review", async () => {
    await createOrder(user);
    const created = await submitReview(token);
    const path = reviewUrl(`/${created.body.review._id}`);

    expect((await auth(otherToken, request(app).patch(path)).send(reviewPayload)).status).toBe(404);
    expect((await auth(otherToken, request(app).delete(path))).status).toBe(404);
    expect(await Review.countDocuments()).toBe(1);
  });

  test("rejects unsupported image uploads", async () => {
    await createOrder(user);
    const response = await auth(token, request(app).post(reviewUrl()))
      .field("rating", "5")
      .field("body", reviewPayload.body)
      .attach("photos", Buffer.from("not an image"), { filename: "file.pdf", contentType: "application/pdf" });

    expect(response.status).toBe(400);
    expect(await Review.countDocuments()).toBe(0);
  });

  test("rejects photos larger than 5 MB", async () => {
    await createOrder(user);
    const response = await auth(token, request(app).post(reviewUrl()))
      .field("rating", "5")
      .field("body", reviewPayload.body)
      .attach("photos", Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: "large.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/under 5 MB/i);
    expect(await Review.countDocuments()).toBe(0);
  });
});
