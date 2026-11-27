import { Router } from "express";
import { getCategoryTree, getCategoryBySlug } from "../controllers/category.controller.js";

const router = Router();
router.get("/", getCategoryTree);
router.get("/:slug", getCategoryBySlug);

export default router;
