import multer from "multer";
import { ApiError } from "./ApiError.js";
import { MAX_PHOTOS, MAX_PHOTO_BYTES } from "../constants/review.js";
import { deleteImage, uploadReviewImage } from "../services/cloudinary.service.js";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: MAX_PHOTOS },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true);
    cb(new ApiError(400, "Only JPG, PNG or WebP images are allowed"));
  },
}).array("photos", MAX_PHOTOS);

export const handleReviewUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") return next(new ApiError(400, "Each photo must be under 5 MB"));
      if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
        return next(new ApiError(400, `You can upload up to ${MAX_PHOTOS} photos`));
      }
      return next(new ApiError(400, "Photo upload failed"));
    }
    next(err);
  });
};

const looksLikeImage = (buf) => {
  if (!buf || buf.length < 12) return false;
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const webp = buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP";
  return jpeg || png || webp;
};

export const deleteReviewPhotos = async (photos = []) => {
  if (!photos.length) return;
  const results = await Promise.allSettled(
    photos.filter((p) => p?.publicId).map((p) => deleteImage(p.publicId))
  );
  results
    .filter((result) => result.status === "rejected")
    .forEach((result) => console.error("Review photo cleanup failed:", result.reason));
};

export const uploadReviewPhotos = async (files = []) => {
  if (!files.length) return [];

  const uploaded = [];
  try {
    for (const file of files) {
      if (!looksLikeImage(file.buffer)) throw new ApiError(400, "One of the files is not a valid image");
      uploaded.push(await uploadReviewImage(file.buffer, file.mimetype));
    }
    return uploaded;
  } catch (err) {
    await deleteReviewPhotos(uploaded);
    throw err;
  }
};
