import { Router } from "express";
import * as seo from "../controllers/seo.controller.js";

const router = Router();

router.get("/sitemap.xml", seo.sitemap);
router.get("/robots.txt", seo.robots);

export default router;
