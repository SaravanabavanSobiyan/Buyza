import request from "supertest";
import app from "../src/app.js";
import Product from "../src/models/Product.js";
import Category from "../src/models/Category.js";
import { startDb, stopDb, makeCategory, makeProduct } from "./helpers.js";
import { API, maybeIt } from "./apiMap.js";

const C = API.catalog;
let shirts;
let hoodies;

const mapParams = (query) => Object.fromEntries(Object.entries(query).map(([key, value]) => [C.params[key] ?? key, value]));
const list = (query = {}) => request(app).get(C.list).query(mapParams(query));
const names = (res) => C.productsOf(res).map((product) => product.name);
const categoryValue = (category) => (C.categoryBy === "id" ? String(category._id) : category.slug);
const setCreatedAt = (product, value) =>
  Product.collection.updateOne({ _id: product._id }, { $set: { createdAt: new Date(value) } });

beforeAll(startDb);
afterAll(stopDb);

beforeEach(async () => {
  await Promise.all([Product.deleteMany(), Category.deleteMany()]);
  shirts = await makeCategory("Shirts");
  hoodies = await makeCategory("Hoodies");
  const hoodie = await makeProduct({ name: "Blue Hoodie", slug: "blue-hoodie", price: 3000, stock: 4, category: hoodies._id, variants: [{ sku: "BLUE-M", price: 3000, stock: 4 }, { sku: "BLUE-L", price: 3200, stock: 0 }] });
  const red = await makeProduct({ name: "Red Tee", slug: "red-tee", price: 1000, stock: 10, category: shirts._id });
  const plain = await makeProduct({ name: "Plain Tee", slug: "plain-tee", price: 1500, stock: 10, category: shirts._id });
  await makeProduct({ name: "Old Cap", slug: "old-cap", price: 500, stock: 10, category: shirts._id, isActive: false });
  await Promise.all([
    setCreatedAt(hoodie, "2026-01-01T05:00:00Z"),
    setCreatedAt(red, "2026-01-02T05:00:00Z"),
    setCreatedAt(plain, "2026-01-03T05:00:00Z"),
  ]);
});

describe("listing", () => {
  test("shows only active products", async () => {
    const res = await list();
    expect(res.status).toBe(200);
    expect(names(res).sort()).toEqual(["Blue Hoodie", "Plain Tee", "Red Tee"]);
  });
  test("paginates and returns an empty result for no matches", async () => {
    const page1 = await list({ limit: 2, page: 1 });
    const page2 = await list({ limit: 2, page: 2 });
    expect(C.productsOf(page1)).toHaveLength(2);
    expect(C.productsOf(page2)).toHaveLength(1);
    expect(names(await list({ q: "nothing-matches-this" }))).toEqual([]);
  });
});

describe("search and filters", () => {
  test("searches case-insensitively and excludes inactive products", async () => {
    expect(names(await list({ q: "HOODIE" }))).toEqual(["Blue Hoodie"]);
    expect(names(await list({ q: "tee" })).sort()).toEqual(["Plain Tee", "Red Tee"]);
    expect(names(await list({ q: "cap" }))).toEqual([]);
  });
  test("search punctuation is handled as text, not a regular-expression error", async () => {
    for (const q of ["(.*[", "\\", "[[[", "$where", "%", "\"; drop table"]) {
      expect((await list({ q })).status).toBe(200);
    }
  });
  test("filters by category and price", async () => {
    expect(names(await list({ category: categoryValue(hoodies) }))).toEqual(["Blue Hoodie"]);
    expect(names(await list({ category: categoryValue(shirts) })).sort()).toEqual(["Plain Tee", "Red Tee"]);
    expect(names(await list({ minPrice: 1200, maxPrice: 2000 }))).toEqual(["Plain Tee"]);
  });
  maybeIt(C.sorts.priceAsc)("sorts by price", async () => {
    const res = await list({ sort: C.sorts.priceAsc });
    expect(C.productsOf(res).map((product) => product.price)).toEqual([1000, 1500, 3000]);
  });
  maybeIt(C.sorts.priceDesc)("sorts by price in descending order", async () => {
    const res = await list({ sort: C.sorts.priceDesc });
    expect(C.productsOf(res).map((product) => product.price)).toEqual([3000, 1500, 1000]);
  });
  maybeIt(C.sorts.newest)("sorts newest products first", async () => {
    expect(names(await list({ sort: C.sorts.newest }))).toEqual(["Plain Tee", "Red Tee", "Blue Hoodie"]);
  });
});

describe("junk input", () => {
  test.each([
    ["a negative page", { page: "-1" }],
    ["a text page", { page: "abc" }],
    ["a huge limit", { limit: "100000" }],
    ["a text price", { minPrice: "abc" }],
  ])("%s never returns a server error", async (_label, query) => {
    expect((await list(query)).status).toBeLessThan(500);
  });
  test("rejects operator objects in validated query fields", async () => {
    const response = await request(app).get(`${C.list}?search%5B%24ne%5D=x`);
    expect(response.status).toBe(400);
  });
});

describe("product detail", () => {
  test("returns a public product with variants", async () => {
    const res = await request(app).get(C.detail("blue-hoodie"));
    expect(res.status).toBe(200);
    expect(C.productOf(res).name).toBe("Blue Hoodie");
  });
  test("returns 404 for inactive or unknown products", async () => {
    expect((await request(app).get(C.detail("old-cap"))).status).toBe(404);
    expect((await request(app).get(C.detail("does-not-exist"))).status).toBe(404);
  });
  test("malformed slugs never produce server errors", async () => {
    for (const slug of ["../../etc/passwd", "%00", "<script>", "a b", "$ne"]) {
      expect((await request(app).get(C.detail(slug))).status).toBeLessThan(500);
    }
  });
});
