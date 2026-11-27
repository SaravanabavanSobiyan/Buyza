import request from "supertest";
import app from "../src/app.js";
import Product from "../src/models/Product.js";
import Cart from "../src/models/Cart.js";
import ShippingMethod from "../src/models/ShippingMethod.js";
import User from "../src/models/User.js";
import { startDb, stopDb, sign, as, makeUser } from "./helpers.js";
import { API, newProduct } from "./apiMap.js";
import { SRI_LANKAN_PROVINCES } from "../src/utils/sriLankaProvinces.js";

const Q = API.checkout;
let user;
let token;
let tee;
let hoodie;
let standard;

const guestItem = (product, quantity = 1, variantSku = null) => ({
  productId: String(product._id),
  variantSku,
  quantity,
});
const quote = (body, withToken) => {
  const req = request(app).post(Q.quote).send(body);
  return withToken ? as(withToken, req) : req;
};
const read = (res) => Q.quoteOf(res);
const selected = (value) => {
  const options = Q.optionsOf(value);
  return options.find((option) => Q.optionId(option) === Q.selectedIdOf(value)) ?? options[0];
};
const addsUp = (value) =>
  expect(value.total).toBeCloseTo(value.subtotal - (value.discount || 0) + (selected(value)?.price || 0), 2);

beforeAll(startDb);
afterAll(stopDb);

beforeEach(async () => {
  await Promise.all([User.deleteMany(), Product.deleteMany(), Cart.deleteMany(), ShippingMethod.deleteMany()]);
  user = await makeUser({ email: "buyer@example.com" });
  token = sign(user);
  tee = await newProduct({ name: "Plain Tee", slug: "plain-tee", price: 1000, stock: 5 });
  hoodie = await newProduct({
    name: "Hoodie",
    slug: "hoodie",
    price: 2000,
    stock: 0,
    variants: [
      { sku: "RED-M", price: 1500, stock: 3 },
      { sku: "BLUE-L", price: 1800, stock: 0 },
    ],
  });
  standard = await ShippingMethod.create({
    code: "standard",
    name: "Standard",
    description: "Standard delivery",
    minDeliveryDays: 3,
    maxDeliveryDays: 5,
    flatPrice: 500,
    provinceRates: [{ province: "Western Province", price: 400 }],
    freeShippingThreshold: 5000000,
    sortOrder: 1,
  });
});

describe("guest quote", () => {
  test("prices items from the database and offers delivery options", async () => {
    const res = await quote({ address: Q.address(), email: "guest@example.com", items: [guestItem(tee, 2)] });
    expect(res.status).toBe(200);
    const value = read(res);
    expect(value.subtotal).toBe(2000);
    expect(Q.optionsOf(value).length).toBeGreaterThanOrEqual(1);
  });

  test("browser prices are ignored", async () => {
    const res = await quote({
      address: Q.address(),
      email: "guest@example.com",
      items: [{ ...guestItem(tee, 2), price: 1, unitPrice: 1, lineTotal: 2 }],
    });
    expect(res.status).toBe(200);
    expect(read(res).subtotal).toBe(2000);
  });

  test("variants use their own price and require a variant", async () => {
    const ok = await quote({
      address: Q.address(),
      email: "guest@example.com",
      items: [guestItem(hoodie, 2, "RED-M")],
    });
    expect(read(ok).subtotal).toBe(3000);

    const missing = await quote({
      address: Q.address(),
      email: "guest@example.com",
      items: [guestItem(hoodie, 1)],
    });
    expect([200, 400, 409]).toContain(missing.status);
    if (missing.status === 200) expect(read(missing).canCheckout).toBe(false);
  });

  test("empty carts and missing addresses are refused", async () => {
    const empty = await quote({ address: Q.address(), email: "guest@example.com", items: [] });
    expect([200, 400]).toContain(empty.status);
    if (empty.status === 200) expect(read(empty).canCheckout).toBe(false);
    expect((await quote({ email: "guest@example.com", items: [guestItem(tee)] })).status).toBe(400);
  });

  test("out-of-stock and inactive products are flagged", async () => {
    const overstock = await quote({
      address: Q.address(),
      email: "guest@example.com",
      items: [guestItem(tee, 99)],
    });
    expect([200, 400, 409]).toContain(overstock.status);
    if (overstock.status === 200) expect(read(overstock).canCheckout).toBe(false);

    await Product.updateOne({ _id: tee._id }, { isActive: false });
    const inactive = await quote({
      address: Q.address(),
      email: "guest@example.com",
      items: [guestItem(tee)],
    });
    expect(inactive.status).toBe(200);
    expect(read(inactive).canCheckout).toBe(false);
  });

  test("database operators in items are refused", async () => {
    const res = await quote({
      address: Q.address(),
      email: "guest@example.com",
      items: [{ productId: { $ne: null }, variantSku: null, quantity: 1 }],
    });
    expect(res.status).toBe(400);
  });
});

describe("authenticated quote", () => {
  test("uses the saved cart and does not accept replacement client items", async () => {
    const added = await as(token, request(app).post("/api/cart/items"))
      .send({ productId: String(tee._id), quantity: 3 });
    expect(added.status).toBe(201);

    const res = await quote({ address: Q.address() }, token);
    expect(res.status).toBe(200);
    expect(read(res).subtotal).toBe(3000);

    const replacement = await quote({
      address: Q.address(),
      items: [guestItem(tee, 1)],
    }, token);
    expect(replacement.status).toBe(400);
  });

  test("refuses to quote an authenticated empty cart", async () => {
    const res = await quote({ address: Q.address() }, token);
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) expect(read(res).canCheckout).toBe(false);
  });
});

describe("address and delivery checks", () => {
  test.each([
    ["a too-short phone", { phone: "123" }],
    ["text in the phone", { phone: "call me" }],
    ["a missing street", { line1: "" }],
    ["a missing city", { city: "" }],
    ["a made-up province", { province: "Atlantis" }],
  ])("refuses %s", async (_label, overrides) => {
    const res = await quote({
      address: { ...Q.address(), ...overrides },
      email: "guest@example.com",
      items: [guestItem(tee)],
    });
    expect(res.status).toBe(400);
  });

  test("choosing a delivery option updates the selected method and total", async () => {
    const first = read(await quote({
      address: Q.address(),
      email: "guest@example.com",
      items: [guestItem(tee)],
    }));
    for (const option of Q.optionsOf(first)) {
      const res = await quote({
        address: Q.address(),
        email: "guest@example.com",
        items: [guestItem(tee)],
        shippingMethodId: Q.optionId(option),
      });
      const value = read(res);
      expect(Q.selectedIdOf(value)).toBe(Q.optionId(option));
      addsUp(value);
    }
  });

  test("offers shipping for every supported province using server-calculated rates", async () => {
    for (const province of SRI_LANKAN_PROVINCES) {
      const res = await quote({
        address: Q.address(province),
        email: "guest@example.com",
        items: [guestItem(tee)],
        shippingMethodId: String(standard._id),
      });
      expect(res.status).toBe(200);
      const value = read(res);
      expect(Q.optionsOf(value).length).toBeGreaterThan(0);
      expect(value.total).toBe(value.subtotal + value.shipping);
    }

    const western = read(await quote({
      address: Q.address("Western Province"),
      email: "guest@example.com",
      items: [guestItem(tee)],
      shippingMethodId: String(standard._id),
    }));
    const northern = read(await quote({
      address: Q.address("Northern Province"),
      email: "guest@example.com",
      items: [guestItem(tee)],
      shippingMethodId: String(standard._id),
    }));
    expect(western.shipping).toBe(400);
    expect(northern.shipping).toBe(500);
  });
});
