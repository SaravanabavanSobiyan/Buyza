import { Router } from "express";
import { optionalAuth } from "../middleware/optionalAuth.js";
import { validate } from "../middleware/validate.js";
import { quoteCheckout } from "../controllers/checkout.controller.js";
import { checkoutQuoteSchema } from "../validators/checkout.validators.js";

const router = Router();

router.post("/quote", optionalAuth, validate(checkoutQuoteSchema), quoteCheckout);

export default router;
