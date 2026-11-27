import request from "supertest";
import app from "../src/app.js";
import { startDb, stopDb, sign, as, makeUser, idempotencyKey } from "./helpers.js";
import { API, newProduct, sessionFrom, withSession } from "./apiMap.js";
import User from "../src/models/User.js";
import Product from "../src/models/Product.js";
import Order from "../src/models/Order.js";
import Cart from "../src/models/Cart.js";
import Review from "../src/models/Review.js";
import Wishlist from "../src/models/Wishlist.js";
import EmailJob from "../src/models/EmailJob.js";
import ShippingMethod from "../src/models/ShippingMethod.js";

const A = API.auth;
const C = API.catalog;
const Q = API.checkout;
const address = Q.address();

const placeOrder = async ({ authed, items, email, key = idempotencyKey() }) => {
  const quoteReq = request(app).post(Q.quote).send({ address, ...(items && { items }), ...(email && { email }) });
  const quoteRes = authed ? await authed(quoteReq) : await quoteReq;
  if (quoteRes.status >= 400) return quoteRes;
  const q = Q.quoteOf(quoteRes);
  const shippingMethodId = Q.optionId(Q.optionsOf(q)[0]);
  const orderReq = request(app)
    .post("/api/orders")
    .set("Idempotency-Key", key)
    .send({ address, shippingMethodId, paymentMethod: "cod", ...(items && { items }), ...(email && { email }) });
  return authed ? authed(orderReq) : orderReq;
};

beforeAll(startDb);
afterAll(stopDb);

beforeEach(async () => {
  await Promise.all([
    User.deleteMany(),
    Product.deleteMany(),
    Order.deleteMany(),
    Cart.deleteMany(),
    Review.deleteMany(),
    Wishlist.deleteMany(),
    EmailJob.deleteMany(),
    ShippingMethod.deleteMany(),
  ]);
  await ShippingMethod.create({
    code: "standard",
    name: "Standard",
    description: "Standard delivery",
    minDeliveryDays: 3,
    maxDeliveryDays: 5,
    flatPrice: 350,
    freeShippingThreshold: 5000000,
    sortOrder: 1,
  });
});

test("a customer registers, shops, orders and reviews", async () => {
  const tee = await newProduct({ name: "Plain Tee", slug: "plain-tee", price: 1000, stock: 10 });
  const admin = await makeUser({ name: "Ada Admin", email: "admin@example.com", role: "admin" });
  const adminToken = sign(admin);
  const registered = await request(app).post(A.register).send(A.registerBody({
    name: "Nimal Perera",
    email: "nimal@example.com",
    password: "Str0ng!Passw0rd",
  }));
  expect([200, 201]).toContain(registered.status);
  const session = sessionFrom(registered);
  const me = (req) => withSession(req, session);

  expect(C.productsOf(await request(app).get(C.list)).map((product) => product.slug)).toContain("plain-tee");
  expect((await me(request(app).post("/api/cart/items")).send({
    productId: String(tee._id),
    quantity: 2,
  })).status).toBe(201);

  const placed = await placeOrder({ authed: me });
  expect(placed.status).toBe(201);
  expect(placed.body.order.items[0]).toMatchObject({ name: "Plain Tee", unitPrice: 1000, quantity: 2 });
  expect((await Product.findById(tee._id)).stock).toBe(8);

  const mine = await me(request(app).get("/api/orders"));
  expect(mine.body.orders.map((order) => order.orderNumber)).toContain(placed.body.order.orderNumber);
  expect((await me(request(app).get(`/api/orders/${placed.body.order.orderNumber}`))).status).toBe(200);

  const tooEarly = await me(request(app).post(`/api/products/${tee._id}/reviews`))
    .send({ rating: 5, body: "Lovely quality, would buy again." });
  expect(tooEarly.status).toBe(403);

  const statusRequest = (status) =>
    as(adminToken, request(app).patch(`/api/admin/orders/${placed.body.order.orderNumber}/status`))
      .send({ status });
  for (const status of ["processing", "shipped", "delivered"]) {
    expect((await statusRequest(status)).status).toBe(200);
  }

  const review = await me(request(app).post(`/api/products/${tee._id}/reviews`))
    .send({ rating: 5, title: "Great", body: "Lovely quality, would buy again." });
  expect(review.status).toBe(201);
  expect(await Review.countDocuments({ user: (await User.findOne({ email: "nimal@example.com" }))._id })).toBe(1);
  expect((await Product.findById(tee._id)).ratingAvg).toBe(5);

  const publicReviews = await request(app).get(`/api/products/${tee._id}/reviews`);
  expect(publicReviews.status).toBe(200);
  expect(JSON.stringify(publicReviews.body)).not.toContain("nimal@example.com");
});

test("a guest orders without an account", async () => {
  const tee = await newProduct({ name: "Plain Tee", slug: "plain-tee", price: 1000, stock: 10 });
  const items = [{ productId: String(tee._id), variantSku: null, quantity: 2 }];
  const key = idempotencyKey();
  const placed = await placeOrder({ items, email: "guest@example.com", key });
  expect(placed.status).toBe(201);
  expect(placed.body.order.user).toBeNull();
  expect(placed.body.order.email).toBe("guest@example.com");
  expect((await Product.findById(tee._id)).stock).toBe(8);

  const again = await placeOrder({ items, email: "guest@example.com", key });
  expect(again.body.order.orderNumber).toBe(placed.body.order.orderNumber);
  expect(await Order.countDocuments()).toBe(1);
  expect((await Product.findById(tee._id)).stock).toBe(8);
});

test("a guest order without an email is refused", async () => {
  const tee = await newProduct({ name: "Plain Tee", slug: "plain-tee", price: 1000, stock: 10 });
  const res = await placeOrder({ items: [{ productId: String(tee._id), variantSku: null, quantity: 1 }] });
  expect(res.status).toBe(400);
  expect(await Order.countDocuments()).toBe(0);
  expect((await Product.findById(tee._id)).stock).toBe(10);
});

test("two buyers race for the last item", async () => {
  const last = await newProduct({ name: "Last One", slug: "last-one", price: 1000, stock: 1 });
  const a = await makeUser({ email: "a@example.com" });
  const b = await makeUser({ email: "b@example.com" });
  const authA = (req) => as(sign(a), req);
  const authB = (req) => as(sign(b), req);

  for (const authed of [authA, authB]) {
    const res = await authed(request(app).post("/api/cart/items"))
      .send({ productId: String(last._id), quantity: 1 });
    expect(res.status).toBe(201);
  }

  const results = await Promise.all([
    placeOrder({ authed: authA }),
    placeOrder({ authed: authB }),
  ]);
  expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
  expect((await Product.findById(last._id)).stock).toBe(0);
  expect(await Order.countDocuments()).toBe(1);
});

test("double-clicking place order creates one order", async () => {
  const tee = await newProduct({ name: "Plain Tee", slug: "plain-tee", price: 1000, stock: 10 });
  const buyer = await makeUser({ email: "buyer@example.com" });
  const authed = (req) => as(sign(buyer), req);
  await authed(request(app).post("/api/cart/items"))
    .send({ productId: String(tee._id), quantity: 2 });

  const key = idempotencyKey();
  const results = await Promise.all([
    placeOrder({ authed, key }),
    placeOrder({ authed, key }),
  ]);
  expect(results.map((result) => result.status).every((status) => status === 200 || status === 201)).toBe(true);
  expect(results[0].body.order.orderNumber).toBe(results[1].body.order.orderNumber);
  expect(await Order.countDocuments()).toBe(1);
  expect((await Product.findById(tee._id)).stock).toBe(8);
});
