import { Router } from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { handleReviewUpload } from "../utils/reviewUpload.js";
import * as reviews from "../controllers/review.controller.js";
import { reviewSchema } from "./review.validation.js";

const router = Router({ mergeParams: true });

const writeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?._id || "anon"),
  validate: { keyGeneratorIpFallback: false },
});

router.get("/", reviews.list);
router.get("/eligibility", protect, reviews.eligibility);
router.post("/", protect, writeLimiter, handleReviewUpload, validate(reviewSchema), reviews.create);
router.patch("/:reviewId", protect, writeLimiter, handleReviewUpload, validate(reviewSchema), reviews.update);
router.delete("/:reviewId", protect, reviews.remove);

export default router;
