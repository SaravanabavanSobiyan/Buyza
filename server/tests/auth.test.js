import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import EmailJob from "../src/models/EmailJob.js";
import User from "../src/models/User.js";
import { sha256 } from "../src/utils/tokens.js";
import { startDb, stopDb, sign, makeUser } from "./helpers.js";
import { API, maybe, sessionFrom, withSession } from "./apiMap.js";

const A = API.auth;
const person = { name: "Nimal Perera", email: "nimal@example.com", password: "Str0ng!Passw0rd" };
const register = (overrides = {}, who = person) =>
  request(app).post(A.register).send({ ...A.registerBody(who), ...overrides });
const login = (who = person, overrides = {}) =>
  request(app).post(A.login).send({ ...A.loginBody(who), ...overrides });
const text = (res) => JSON.stringify(res.body);
const waitForEmail = async (to, template) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const job = await EmailJob.findOne({ to, template });
    if (job) return job;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Expected ${template} email for ${to} to be queued`);
};

beforeAll(startDb);
afterAll(stopDb);
beforeEach(() => Promise.all([User.deleteMany(), EmailJob.deleteMany()]));

describe("register", () => {
  test("creates a customer with a hashed password and never returns the password", async () => {
    const res = await register();
    expect([200, 201]).toContain(res.status);
    expect(text(res)).not.toContain(person.password);
    expect(text(res)).not.toMatch(/"password"/);

    const saved = await User.findOne({ email: person.email }).select("+password");
    expect(saved).not.toBeNull();
    expect(saved.role).toBe("customer");
    expect(saved.password).not.toBe(person.password);
    expect(saved.password).toMatch(/^\$(2[aby]|argon2)/);
  });

  test("stores the email in lower case and rejects duplicate accounts", async () => {
    await register({ email: "Nimal@Example.COM" });
    expect(await User.findOne({ email: "nimal@example.com" })).not.toBeNull();
    const duplicate = await register({ email: "NIMAL@example.com" });
    expect([400, 409]).toContain(duplicate.status);
  });

  test.each([
    ["a missing email", { email: undefined }],
    ["an invalid email", { email: "not-an-email" }],
    ["an empty password", { password: "" }],
    ["a too-short password", { password: "123" }],
  ])("rejects %s", async (_label, overrides) => {
    const res = await register(overrides);
    expect(res.status).toBe(400);
  });

  test("customer cannot grant themselves admin access", async () => {
    const res = await register({ role: "admin", isBlocked: false, isVerified: true });
    if (res.status < 300) {
      expect((await User.findOne({ email: person.email })).role).toBe("customer");
    } else {
      expect(res.status).toBe(400);
    }
  });
});

describe("login", () => {
  beforeEach(async () => {
    await request(app).post(A.register).send(A.registerBody(person));
  });

  test("works with the right password and never returns it", async () => {
    const res = await login();
    expect(res.status).toBe(200);
    expect(Boolean(sessionFrom(res).token) || Boolean(sessionFrom(res).cookies?.length)).toBe(true);
    expect(text(res)).not.toContain(person.password);
  });

  test("ignores email letter case", async () => {
    expect((await login(person, { email: "NIMAL@EXAMPLE.COM" })).status).toBe(200);
  });

  test("wrong passwords and unknown emails have the same 401 message", async () => {
    const wrong = await login(person, { password: "Wrong!Passw0rd" });
    const unknown = await login({ ...person, email: "nobody@example.com" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(unknown.body.message).toBe(wrong.body.message);
  });

  test("blocks suspended accounts", async () => {
    await User.updateOne({ email: person.email }, { isBlocked: true });
    const res = await login();
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("ACCOUNT_SUSPENDED");
  });

  test("database operators cannot bypass login", async () => {
    for (const body of [
      { email: { $gt: "" }, password: { $gt: "" } },
      { email: person.email, password: { $ne: "x" } },
    ]) {
      const res = await request(app).post(A.login).send(body);
      expect([400, 401]).toContain(res.status);
    }
  });
});

describe("tokens", () => {
  let user;
  beforeEach(async () => {
    user = await makeUser({ email: "tok@example.com" });
  });
  const orders = (token) => {
    const req = request(app).get("/api/orders");
    return token ? req.set("Authorization", `Bearer ${token}`) : req;
  };
  test("accepts only a valid access token", async () => {
    expect((await orders(sign(user))).status).toBe(200);
    expect((await orders()).status).toBe(401);
  });
  test("rejects malformed, expired and wrong-secret tokens", async () => {
    expect((await orders("garbage")).status).toBe(401);
    const expired = jwt.sign({ sub: String(user._id) }, process.env.JWT_ACCESS_SECRET, { expiresIn: -10 });
    expect((await orders(expired)).status).toBe(401);
    const wrong = jwt.sign({ sub: String(user._id) }, "wrong-secret");
    expect((await orders(wrong)).status).toBe(401);
  });
  test("rejects tokens for missing accounts and tokens without a subject", async () => {
    const token = sign(user);
    await User.deleteOne({ _id: user._id });
    expect((await orders(token)).status).toBe(401);
    expect((await orders(jwt.sign({}, process.env.JWT_ACCESS_SECRET))).status).toBe(401);
  });
});

maybe(A.logout)("logout", () => {
  test("clears the refresh session and revokes its stored hash", async () => {
    await request(app).post(A.register).send(A.registerBody(person));
    const loggedIn = await login();
    const res = await withSession(request(app).post(A.logout), sessionFrom(loggedIn));
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]?.join(";")).toMatch(/refreshToken=;/);
    const saved = await User.findOne({ email: person.email }).select("+refreshTokenHash");
    expect(saved.refreshTokenHash).toBeUndefined();
  });
});

maybe(A.refresh)("refresh", () => {
  test("a made-up refresh token is refused", async () => {
    const res = await request(app).post(A.refresh).send({ refreshToken: "made-up" }).set("Cookie", "refreshToken=made-up");
    expect([400, 401, 403]).toContain(res.status);
  });

  test("rotates a valid refresh cookie and invalidates the previous one", async () => {
    await request(app).post(A.register).send(A.registerBody(person));
    const session = sessionFrom(await login());
    const refreshed = await withSession(request(app).post(A.refresh), session);
    expect(refreshed.status).toBe(200);
    expect(sessionFrom(refreshed).token).toBeTruthy();

    const oldCookie = session.cookies?.map((cookie) => cookie.split(";")[0]).join("; ");
    const replay = await request(app)
      .post(A.refresh)
      .set("Cookie", oldCookie)
      .set("X-Requested-With", "XMLHttpRequest");
    expect(replay.status).toBe(401);
  });
});

describe("forgot and reset password", () => {
  const reset = (token, password = "New!StrongPass123") =>
    request(app).post(A.resetPassword(token)).send({ password, confirmPassword: password });

  test("forgot password gives the same response for known and unknown accounts", async () => {
    await makeUser({ email: person.email });
    const known = await request(app).post(A.forgotPassword).send({ email: person.email });
    const resetEmail = await waitForEmail(person.email, "passwordReset");
    const unknown = await request(app).post(A.forgotPassword).send({ email: "nobody@example.com" });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(known.status);
    expect(unknown.body.message).toBe(known.body.message);
    const rawToken = new URL(resetEmail.data.link).pathname.split("/").pop();
    const saved = await User.findOne({ email: person.email }).select("+resetPasswordToken");
    expect(rawToken).toBeTruthy();
    expect(saved.resetPasswordToken).toBe(sha256(rawToken));
    expect(saved.resetPasswordToken).not.toBe(rawToken);
    expect((await request(app).post(A.forgotPassword).send({ email: "not-an-email" })).status).toBe(400);
  });

  test("hashed reset token can be used once and replaces the password", async () => {
    await makeUser({ email: person.email });
    const rawToken = "known-reset-token";
    await User.updateOne(
      { email: person.email },
      { resetPasswordToken: sha256(rawToken), resetPasswordExpires: new Date(Date.now() + 60_000) }
    );

    expect((await reset(rawToken)).status).toBe(200);
    expect((await login(person, { password: "New!StrongPass123" })).status).toBe(200);
    expect((await login()).status).toBe(401);
    expect([400, 401, 410]).toContain((await reset(rawToken)).status);
  });

  test("expired, unknown and mismatched reset tokens are rejected", async () => {
    await makeUser({ email: person.email });
    const expiredToken = "expired-reset-token";
    await User.updateOne(
      { email: person.email },
      { resetPasswordToken: sha256(expiredToken), resetPasswordExpires: new Date(Date.now() - 1000) }
    );
    expect((await reset(expiredToken)).status).toBe(400);
    expect((await reset("unknown-reset-token")).status).toBe(400);

    const validToken = "valid-reset-token";
    await User.updateOne(
      { email: person.email },
      { resetPasswordToken: sha256(validToken), resetPasswordExpires: new Date(Date.now() + 60_000) }
    );
    const mismatch = await request(app).post(A.resetPassword(validToken)).send({
      password: "New!StrongPass123",
      confirmPassword: "Different!Strong123",
    });
    expect(mismatch.status).toBe(400);
    expect((await reset(validToken)).status).toBe(200);
  });
});

describe("profile and password changes", () => {
  test("returns safe profile data and ignores role escalation", async () => {
    const user = await makeUser({ email: "profile@example.com" });
    const token = sign(user);
    const current = await request(app).get(A.me).set("Authorization", `Bearer ${token}`);
    expect(current.status).toBe(200);
    expect(userOfProfile(current).email).toBe(user.email);
    expect(text(current)).not.toMatch(/"password"/);

    const escalation = await request(app)
      .patch(A.updateProfile.path)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New Name", role: "admin", isBlocked: true });
    expect(escalation.status).toBe(400);

    const updated = await request(app)
      .patch(A.updateProfile.path)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New Name" });
    expect(updated.status).toBe(200);
    const saved = await User.findById(user._id);
    expect(saved.name).toBe("New Name");
    expect(saved.role).toBe("customer");
    expect(saved.isBlocked).toBe(false);
  });

  test("requires the current password and accepts a valid replacement", async () => {
    const user = await makeUser({ email: "change@example.com" });
    const token = sign(user);
    const change = (currentPassword) =>
      request(app)
        .put(A.changePassword.path)
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword,
          newPassword: "New!StrongPass123",
          confirmPassword: "New!StrongPass123",
        });

    expect((await change("Wrong!Passw0rd")).status).toBe(400);
    expect((await change("Password123!")).status).toBe(200);
    expect((await login({ email: user.email, password: "New!StrongPass123" })).status).toBe(200);
    expect((await login({ email: user.email, password: "Password123!" })).status).toBe(401);
  });

  test("protected profile routes require authentication", async () => {
    expect((await request(app).get(A.me)).status).toBe(401);
    expect((await request(app).patch(A.updateProfile.path).send({ name: "X" })).status).toBe(401);
  });
});

const userOfProfile = (res) => res.body.data?.user ?? res.body.user;
