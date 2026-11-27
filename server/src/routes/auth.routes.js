import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { loginLimiter, forgotPasswordLimiter } from "../middleware/rateLimiter.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth.validators.js";
import {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  startOAuth,
  finishOAuth,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/forgot-password", forgotPasswordLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password/:token", validate(resetPasswordSchema), resetPassword);
router.get("/:provider", startOAuth);
router.get("/:provider/callback", finishOAuth);

export default router;
