import { Router } from "express";
import { protect } from "../middleware/auth.js";
import * as wishlist from "../controllers/wishlist.controller.js";

const router = Router();

router.use(protect);

router.get("/", wishlist.list);
router.get("/ids", wishlist.ids);
router.put("/:productId", wishlist.add);
router.delete("/:productId", wishlist.remove);

export default router;
