import { Router } from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/auth.js";
import { optionalAuth } from "../middleware/optionalAuth.js";
import { validate } from "../middleware/validate.js";
import { skipRateLimitsInTests } from "../middleware/rateLimiter.js";
import * as orders from "../controllers/order.controller.js";
import {
  cancelOrderSchema,
  placeOrderSchema,
} from "../validators/order.validators.js";

const router = Router();
const placeOrderLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimitsInTests,
});

router.post(
  "/",
  placeOrderLimiter,
  optionalAuth,
  validate(placeOrderSchema),
  orders.placeOrder
);
router.get("/", protect, orders.listOrders);
router.get("/:orderNumber", protect, orders.getOrder);
router.get("/:orderNumber/invoice", protect, orders.downloadInvoice);
router.post(
  "/:orderNumber/cancel",
  protect,
  validate(cancelOrderSchema),
  orders.cancelOrder
);

export default router;
