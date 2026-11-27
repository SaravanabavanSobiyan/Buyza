import { can, permissionsFor, ROLES } from "../src/constants/permissions.js";

test("staff can process orders and inventory but cannot cancel or manage customers", () => {
  expect(can("staff", "orders:update")).toBe(true);
  expect(can("staff", "inventory:update")).toBe(true);
  expect(can("staff", "orders:cancel")).toBe(false);
  expect(can("staff", "customers:block")).toBe(false);
  expect(can("staff", "dashboard:read")).toBe(false);
});

test("managers receive staff permissions plus manager capabilities", () => {
  for (const permission of permissionsFor("staff")) {
    expect(can("manager", permission)).toBe(true);
  }
  expect(can("manager", "orders:cancel")).toBe(true);
  expect(can("manager", "customers:block")).toBe(true);
  expect(can("manager", "dashboard:read")).toBe(true);
  expect(can("manager", "staff:manage")).toBe(false);
  expect(can("manager", "audit:read")).toBe(false);
});

test("only admins receive wildcard permissions and unknown roles receive none", () => {
  expect(can("admin", "anything:at-all")).toBe(true);
  expect(can("customer", "admin:access")).toBe(false);
  expect(can("unknown", "orders:read")).toBe(false);
  expect(can(undefined, "orders:read")).toBe(false);
  expect(ROLES).toEqual(["customer", "staff", "manager", "admin"]);
});
