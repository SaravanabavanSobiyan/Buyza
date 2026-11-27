import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  forgotPasswordLimiter,
  loginEmailLimiter,
  loginLimiter,
  refreshLimiter,
  registerLimiter,
  resetPasswordLimiter,
} from "../middleware/rateLimiter.js";
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

router.post("/register", validate(registerSchema), registerLimiter, register);
router.post("/login", validate(loginSchema), loginLimiter, loginEmailLimiter, login);
router.post("/refresh", refreshLimiter, refresh);
router.post("/logout", refreshLimiter, logout);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPasswordLimiter, forgotPassword);
router.post("/reset-password/:token", validate(resetPasswordSchema), resetPasswordLimiter, resetPassword);
router.get("/:provider", startOAuth);
router.get("/:provider/callback", finishOAuth);

export default router;
