import multer from "multer";
import { ApiError } from "../utils/ApiError.js";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

const fileFilter = (req, file, cb) =>
  ALLOWED.includes(file.mimetype)
    ? cb(null, true)
    : cb(new ApiError(400, "Only JPG, PNG or WebP images are allowed"));

export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter,
}).single("avatar");

export const uploadProductImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 8 }, // 3 MB each, 8 at a time
  fileFilter,
}).array("images", 8);
