import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { uploadAvatar } from "../middleware/upload.js";
import { updateProfileSchema, changePasswordSchema } from "../validators/user.validators.js";
import { getMe, updateMe, updateAvatar, changePassword } from "../controllers/user.controller.js";

const router = Router();

router.use(protect); // everything below needs a logged-in user

router.get("/me", getMe);
router.patch("/me", validate(updateProfileSchema), updateMe);
router.patch("/me/avatar", uploadAvatar, updateAvatar);
router.put("/me/password", validate(changePasswordSchema), changePassword);

export default router;
