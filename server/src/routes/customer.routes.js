import { Router } from "express";
import { protect, requirePermission } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import * as customers from "../controllers/customer.controller.js";

const router = Router();
router.use(protect);
router.get("/", requirePermission("customers:read"), customers.list);
router.get("/:id", requirePermission("customers:read"), customers.detail);
router.get("/:id/orders", requirePermission("customers:read"), customers.orders);
router.post("/:id/block", requirePermission("customers:block"), validate(customers.blockSchema), customers.block);
router.post("/:id/unblock", requirePermission("customers:block"), customers.unblock);

export default router;
