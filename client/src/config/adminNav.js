export const ADMIN_NAV = [
  { label: "Dashboard", to: "/admin", permission: "dashboard:read", end: true },
  { label: "Orders", to: "/admin/orders", permission: "orders:read" },
  { label: "Products", to: "/admin/products", permission: "products:read" },
  { label: "Inventory", to: "/admin/inventory", permission: "inventory:read" },
  { label: "Customers", to: "/admin/customers", permission: "customers:read" },
  { label: "Categories", to: "/admin/categories", permission: "products:write" },
  { label: "Brands", to: "/admin/brands", permission: "products:write" },
  { label: "Staff & roles", to: "/admin/staff", permission: "staff:manage" },
  { label: "Audit log", to: "/admin/audit-log", permission: "audit:read" },
];
