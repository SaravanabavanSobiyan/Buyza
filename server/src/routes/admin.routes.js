import { Router } from "express";
import { protect, requirePermission } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { uploadProductImages } from "../middleware/upload.js";
import {
  categorySchema,
  updateCategorySchema,
  brandSchema,
  updateBrandSchema,
} from "../validators/catalog.validators.js";
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from "../validators/product.validators.js";
import {
  adminListCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";
import {
  adminListBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} from "../controllers/brand.controller.js";
import {
  listAdminProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadImages,
} from "../controllers/product.controller.js";
import {
  listInventory,
  getStockAlerts,
  getStockHistory,
  adjustStock,
} from "../controllers/inventory.controller.js";
import {
  adjustStockSchema,
  inventoryQuerySchema,
  historyQuerySchema,
} from "../validators/inventory.validators.js";
import * as staff from "../controllers/staff.controller.js";
import * as auditLogs from "../controllers/audit.controller.js";

const router = Router();

router.use(protect);

router.get("/me", requirePermission("admin:access"), staff.me);

router.get("/staff", requirePermission("staff:manage"), staff.list);
router.get("/users", requirePermission("staff:manage"), staff.search);
router.patch("/users/:id/role", requirePermission("staff:manage"), validate(staff.roleSchema), staff.changeRole);
router.patch("/users/:id/block", requirePermission("customers:block"), validate(staff.blockSchema), staff.setBlocked);

router.get("/audit-logs/actions", requirePermission("audit:read"), auditLogs.actions);
router.get("/audit-logs", requirePermission("audit:read"), auditLogs.list);

router.get("/categories", requirePermission("products:write"), adminListCategories);
router.post("/categories", requirePermission("products:write"), validate(categorySchema), createCategory);
router.patch("/categories/:id", requirePermission("products:write"), validate(updateCategorySchema), updateCategory);
router.delete("/categories/:id", requirePermission("products:write"), deleteCategory);

router.get("/brands", requirePermission("products:write"), adminListBrands);
router.post("/brands", requirePermission("products:write"), validate(brandSchema), createBrand);
router.patch("/brands/:id", requirePermission("products:write"), validate(updateBrandSchema), updateBrand);
router.delete("/brands/:id", requirePermission("products:write"), deleteBrand);

router.get("/products", requirePermission("products:read"), validate(productQuerySchema, "query"), listAdminProducts);
router.get("/products/:id", requirePermission("products:read"), getProduct);
router.post("/products", requirePermission("products:write"), validate(createProductSchema), createProduct);
router.patch("/products/:id", requirePermission("products:write"), validate(updateProductSchema), updateProduct);
router.delete("/products/:id", requirePermission("products:write"), deleteProduct);

router.post("/uploads/product-images", requirePermission("products:write"), uploadProductImages, uploadImages);

router.get("/inventory", requirePermission("inventory:read"), validate(inventoryQuerySchema, "query"), listInventory);
router.get("/inventory/alerts", requirePermission("inventory:read"), getStockAlerts);
router.get("/inventory/history", requirePermission("inventory:read"), validate(historyQuerySchema, "query"), getStockHistory);
router.post("/inventory/adjust", requirePermission("inventory:update"), validate(adjustStockSchema), adjustStock);

export default router;
