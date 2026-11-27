import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { publicProductQuerySchema } from "../validators/public.validators.js";
import { getPublicProduct, listPublicProducts } from "../controllers/catalog.controller.js";

const router = Router();
router.get("/", validate(publicProductQuerySchema, "query"), listPublicProducts);
router.get("/:slug", getPublicProduct);

export default router;
