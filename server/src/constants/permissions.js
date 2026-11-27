export const ROLES = ["customer", "staff", "manager", "admin"];
export const STAFF_ROLES = ["staff", "manager", "admin"];

const STAFF = [
  "admin:access",
  "orders:read",
  "orders:update",
  "orders:mark_paid",
  "inventory:read",
  "inventory:update",
  "products:read",
];

const MANAGER = [
  ...STAFF,
  "orders:cancel",
  "products:write",
  "customers:read",
  "customers:block",
  "dashboard:read",
];

export const ROLE_PERMISSIONS = {
  customer: [],
  staff: STAFF,
  manager: MANAGER,
  admin: ["*"],
};

export const permissionsFor = (role) => ROLE_PERMISSIONS[role] ?? [];

export const can = (role, permission) => {
  const permissions = permissionsFor(role);
  return permissions.includes("*") || permissions.includes(permission);
};
