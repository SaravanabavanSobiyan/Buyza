import request from "supertest";
import app from "../src/app.js";
import Address from "../src/models/Address.js";
import User from "../src/models/User.js";
import { startDb, stopDb, makeUser, sign } from "./helpers.js";

const addressBody = (overrides = {}) => ({
  label: "Home",
  fullName: "Nimal Perera",
  phone: "0771234567",
  line1: "12 Galle Road",
  line2: "",
  city: "Colombo",
  province: "Western Province",
  postalCode: "00300",
  country: "Sri Lanka",
  ...overrides,
});

beforeAll(startDb);
afterAll(stopDb);

let owner;
let other;
let token;
let otherToken;
const auth = (accessToken, req) => req.set("Authorization", `Bearer ${accessToken}`);

beforeEach(async () => {
  await Promise.all([Address.deleteMany(), User.deleteMany()]);
  [owner, other] = await Promise.all([
    makeUser({ email: "address-owner@example.com" }),
    makeUser({ email: "address-other@example.com" }),
  ]);
  token = sign(owner);
  otherToken = sign(other);
});

describe("address authentication and validation", () => {
  test("requires a logged-in user", async () => {
    expect((await request(app).get("/api/addresses")).status).toBe(401);
    expect((await request(app).post("/api/addresses").send(addressBody())).status).toBe(401);
  });

  test("rejects invalid address fields", async () => {
    const res = await auth(token, request(app).post("/api/addresses"))
      .send(addressBody({ phone: "call me" }));
    expect(res.status).toBe(400);
    expect(await Address.countDocuments()).toBe(0);
  });
});

describe("address ownership and defaults", () => {
  test("first address becomes default; another user cannot change or delete it", async () => {
    const created = await auth(token, request(app).post("/api/addresses")).send(
      addressBody({ user: String(other._id), isDefault: false })
    );
    expect(created.status).toBe(201);
    expect(created.body.data.address.isDefault).toBe(true);
    expect(String(created.body.data.address.user)).toBe(String(owner._id));

    const addressId = created.body.data.address._id;
    expect((await auth(otherToken, request(app).patch(`/api/addresses/${addressId}`))
      .send({ city: "Kandy" })).status).toBe(404);
    expect((await auth(otherToken, request(app).delete(`/api/addresses/${addressId}`))).status).toBe(404);
    expect((await Address.findById(addressId)).city).toBe("Colombo");
  });

  test("sets a new default and promotes the remaining address after deletion", async () => {
    const first = await auth(token, request(app).post("/api/addresses")).send(addressBody());
    const second = await auth(token, request(app).post("/api/addresses"))
      .send(addressBody({ label: "Work", city: "Kandy", isDefault: true }));
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const firstId = first.body.data.address._id;
    const secondId = second.body.data.address._id;
    expect((await Address.findById(firstId)).isDefault).toBe(false);
    expect((await Address.findById(secondId)).isDefault).toBe(true);

    const updated = await auth(token, request(app).patch(`/api/addresses/${firstId}`))
      .send({ label: "Updated home", isDefault: true });
    expect(updated.status).toBe(200);
    expect((await Address.findById(firstId)).isDefault).toBe(true);
    expect((await Address.findById(secondId)).isDefault).toBe(false);

    expect((await auth(token, request(app).delete(`/api/addresses/${firstId}`))).status).toBe(200);
    expect((await Address.findById(secondId)).isDefault).toBe(true);
  });

  test("lists only the current user's saved addresses", async () => {
    await auth(token, request(app).post("/api/addresses")).send(addressBody());
    await auth(otherToken, request(app).post("/api/addresses")).send(addressBody({ city: "Galle" }));
    const response = await auth(token, request(app).get("/api/addresses"));
    expect(response.status).toBe(200);
    expect(response.body.data.addresses).toHaveLength(1);
    expect(response.body.data.addresses[0].city).toBe("Colombo");
  });
});
