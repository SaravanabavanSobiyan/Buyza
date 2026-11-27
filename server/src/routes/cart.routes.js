import { Router } from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { skipRateLimitsInTests } from "../middleware/rateLimiter.js";
import { addItemSchema, guestItemsSchema, updateItemSchema } from "../validators/cart.validators.js";
import * as cart from "../controllers/cart.controller.js";

const router = Router();
const previewLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimitsInTests,
});

router.post("/preview", previewLimiter, validate(guestItemsSchema), cart.previewCart);

router.use(protect);

router.get("/", cart.getCart);
router.post("/items", validate(addItemSchema), cart.addItem);
router.post("/merge", validate(guestItemsSchema), cart.mergeCart);
router.patch("/items/:itemId", validate(updateItemSchema), cart.updateItem);
router.delete("/items/:itemId", cart.removeItem);
router.delete("/", cart.clearCart);

export default router;
