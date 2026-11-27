import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import jwt from "jsonwebtoken";
import request from "supertest";
import { startDb, stopDb } from "./helpers.js";
import app from "../src/app.js";
import AuditLog from "../src/models/AuditLog.js";
import EmailJob from "../src/models/EmailJob.js";
import Order from "../src/models/Order.js";
import Product from "../src/models/Product.js";
import StockMovement from "../src/models/StockMovement.js";
import User from "../src/models/User.js";

let admin;
let manager;
let staff;
let customer;
let tokens;
let product;
let orderNumber;

const auth = (token, req) => req.set("Authorization", `Bearer ${token}`);
const id = (document) => document._id.toString();
const sign = (user) => jwt.sign({ sub: id(user) }, process.env.JWT_ACCESS_SECRET);

async function createOrder() {
  orderNumber += 1;
  return Order.create({
    orderNumber: `ORD-2026-${String(orderNumber).padStart(6, "0")}`,
    user: customer._id,
    email: customer.email,
    items: [{
      product: product._id,
      name: product.name,
      unitPrice: 1000,
      quantity: 1,
      lineTotal: 1000,
    }],
    shippingAddress: {
      fullName: customer.name,
      phone: "0771234567",
      line1: "12 Galle Road",
      city: "Colombo",
      province: "Western Province",
      postalCode: "00300",
    },
    shippingMethod: { methodId: "standard", name: "Standard", price: 350 },
    payment: { method: "cod", status: "pending" },
    subtotal: 1000,
    shipping: 350,
    total: 1350,
    status: "pending",
    statusHistory: [{ status: "pending", note: "Order placed" }],
  });
}

beforeAll(startDb);
afterAll(stopDb);

beforeEach(async () => {
  await Promise.all([
    User.deleteMany(),
    Product.deleteMany(),
    Order.deleteMany(),
    AuditLog.deleteMany(),
    EmailJob.deleteMany(),
    StockMovement.deleteMany(),
  ]);
  [admin, manager, staff, customer] = await Promise.all([
    User.create({ name: "Ada Admin", email: "admin@example.com", password: "Password123!", role: "admin" }),
    User.create({ name: "Mala Manager", email: "manager@example.com", password: "Password123!", role: "manager" }),
    User.create({ name: "Sam Staff", email: "staff@example.com", password: "Password123!", role: "staff" }),
    User.create({ name: "Nimal Perera", email: "nimal@example.com", password: "Password123!" }),
  ]);
  tokens = {
    admin: sign(admin),
    manager: sign(manager),
    staff: sign(staff),
    customer: sign(customer),
  };
  product = await Product.create({
    name: "Plain Tee",
    slug: "plain-tee",
    price: 1000,
    stock: 5,
    isActive: true,
  });
  orderNumber = 0;
});

describe("permissions and session blocking", () => {
  test("admin permissions endpoint denies customers and reports staff permissions", async () => {
    expect((await request(app).get("/api/admin/me")).status).toBe(401);
    expect((await auth(tokens.customer, request(app).get("/api/admin/me"))).status).toBe(403);

    const response = await auth(tokens.staff, request(app).get("/api/admin/me"));
    expect(response.status).toBe(200);
    expect(response.body.role).toBe("staff");
    expect(response.body.permissions).toContain("orders:update");
    expect(response.body.permissions).not.toContain("customers:block");

    const adminResponse = await auth(tokens.admin, request(app).get("/api/admin/me"));
    expect(adminResponse.body.permissions).toEqual(["*"]);
  });

  test("blocking takes effect on existing access tokens and login attempts", async () => {
    await User.updateOne({ _id: customer._id }, {
      $set: { isBlocked: true, blockedAt: new Date(), blockedReason: "Policy violation" },
    });

    const response = await auth(tokens.customer, request(app).get("/api/orders"));
    expect(response.status).toBe(403);
    expect(response.body.code).toBe("ACCOUNT_SUSPENDED");

    const login = await request(app).post("/api/auth/login").send({
      email: customer.email,
      password: "Password123!",
    });
    expect(login.status).toBe(403);
    expect(login.body.code).toBe("ACCOUNT_SUSPENDED");
  });

  test("blocked accounts cannot refresh sessions", async () => {
    const login = await request(app).post("/api/auth/login").send({
      email: customer.email,
      password: "Password123!",
      rememberMe: true,
    });
    expect(login.status).toBe(200);

    await User.updateOne({ _id: customer._id }, { $set: { isBlocked: true } });
    const response = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", login.headers["set-cookie"])
      .set("X-Requested-With", "XMLHttpRequest");

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("ACCOUNT_SUSPENDED");
  });

  test("admin can suspend and reactivate a customer; managers cannot change roles", async () => {
    const denied = await auth(
      tokens.manager,
      request(app).patch(`/api/admin/users/${customer._id}/role`)
    ).send({ role: "staff" });
    expect(denied.status).toBe(403);

    const suspended = await auth(
      tokens.admin,
      request(app).patch(`/api/admin/users/${customer._id}/block`)
    ).send({ isBlocked: true, reason: "Fraud review" });
    expect(suspended.status).toBe(200);
    expect(suspended.body.user).toMatchObject({ isBlocked: true, blockedReason: "Fraud review" });
    expect((await User.findById(customer._id)).blockedAt).toBeTruthy();

    const reactivated = await auth(
      tokens.admin,
      request(app).patch(`/api/admin/users/${customer._id}/block`)
    ).send({ isBlocked: false });
    expect(reactivated.status).toBe(200);
    expect(reactivated.body.user).toMatchObject({ isBlocked: false, blockedReason: "" });
  });

  test("role changes take effect immediately and write audit entries", async () => {
    const changed = await auth(
      tokens.admin,
      request(app).patch(`/api/admin/users/${customer._id}/role`)
    ).send({ role: "staff" });
    expect(changed.status).toBe(200);
    expect(changed.body.user.role).toBe("staff");

    const nextRequest = await auth(tokens.customer, request(app).get("/api/admin/me"));
    expect(nextRequest.status).toBe(200);

    const entry = await AuditLog.findOne({ action: "user.role_changed" });
    expect(entry.actorRole).toBe("admin");
    expect(String(entry.actor)).toBe(id(admin));
    expect(entry.meta).toMatchObject({ from: "customer", to: "staff" });
    expect(entry.summary).toContain(customer.email);
  });

  test("admins cannot change their own roles", async () => {
    const selfChange = await auth(
      tokens.admin,
      request(app).patch(`/api/admin/users/${admin._id}/role`)
    ).send({ role: "staff" });
    expect(selfChange.status).toBe(400);
    expect((await User.findById(admin._id)).role).toBe("admin");
  });

  test("managers can view and block customers but cannot manage staff", async () => {
    const customers = await auth(tokens.manager, request(app).get("/api/admin/customers"));
    expect(customers.status).toBe(200);
    expect(customers.body.customers).toHaveLength(1);
    expect((await auth(tokens.staff, request(app).get("/api/admin/customers"))).status).toBe(403);

    const blockedStaff = await auth(
      tokens.manager,
      request(app).patch(`/api/admin/users/${staff._id}/block`)
    ).send({ isBlocked: true });
    expect(blockedStaff.status).toBe(403);

    const blockedCustomer = await auth(
      tokens.manager,
      request(app).patch(`/api/admin/users/${customer._id}/block`)
    ).send({ isBlocked: true, reason: "Policy violation" });
    expect(blockedCustomer.status).toBe(200);
    expect(blockedCustomer.body.user.isBlocked).toBe(true);
  });
});

describe("admin order permissions and audit log", () => {
  test("staff can process orders but cannot cancel them; managers can cancel", async () => {
    const first = await createOrder();
    const listed = await auth(tokens.staff, request(app).get("/api/admin/orders?search=ORD-2026"));
    expect(listed.status).toBe(200);
    expect(listed.body.orders).toHaveLength(1);
    expect(listed.body.orders[0].idempotencyKey).toBeUndefined();

    const processing = await auth(
      tokens.staff,
      request(app).patch(`/api/admin/orders/${first.orderNumber}/status`)
    ).send({ status: "processing" });
    expect(processing.status).toBe(200);
    const entry = await AuditLog.findOne({ action: "order.status_changed", entityId: first.orderNumber });
    expect(entry.actorRole).toBe("staff");
    expect(entry.meta).toMatchObject({ from: "pending", to: "processing" });

    const second = await createOrder();
    const denied = await auth(
      tokens.staff,
      request(app).patch(`/api/admin/orders/${second.orderNumber}/status`)
    ).send({ status: "cancelled", note: "Customer requested" });
    expect(denied.status).toBe(403);
    expect((await Order.findOne({ orderNumber: second.orderNumber })).status).toBe("pending");

    const cancelled = await auth(
      tokens.manager,
      request(app).patch(`/api/admin/orders/${second.orderNumber}/status`)
    ).send({ status: "cancelled", note: "Store cancellation" });
    expect(cancelled.status).toBe(200);
  });

  test("audit log is admin-only and paginated newest first", async () => {
    await AuditLog.create([
      {
        actor: admin._id,
        actorRole: "admin",
        action: "order.status_changed",
        entityType: "order",
        entityId: "ORD-2026-000001",
        summary: "Oldest entry",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        actor: manager._id,
        actorRole: "manager",
        action: "user.role_changed",
        entityType: "user",
        entityId: id(customer),
        summary: "Newest entry",
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);

    expect((await auth(tokens.manager, request(app).get("/api/admin/audit-logs"))).status).toBe(403);
    const response = await auth(
      tokens.admin,
      request(app).get("/api/admin/audit-logs?limit=1&page=1")
    );
    expect(response.status).toBe(200);
    expect(response.body.logs).toHaveLength(1);
    expect(response.body.logs[0].summary).toBe("Newest entry");
    expect(response.body.totalPages).toBe(2);
  });

  test("audit write failure is logged without failing a successful order action", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const createSpy = jest.spyOn(AuditLog, "create").mockRejectedValueOnce(new Error("db down"));
    const order = await createOrder();

    try {
      const response = await auth(
        tokens.staff,
        request(app).patch(`/api/admin/orders/${order.orderNumber}/status`)
      ).send({ status: "processing" });
      expect(response.status).toBe(200);
      expect((await Order.findOne({ orderNumber: order.orderNumber })).status).toBe("processing");
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      createSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});
