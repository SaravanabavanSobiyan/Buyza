import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const { cloudName, apiKey, apiSecret } = env.cloudinary;
const configured = Boolean(cloudName && apiKey && apiSecret);
const uploadsDirectory = fileURLToPath(new URL("../../uploads", import.meta.url));

if (configured) {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
}

async function uploadImageLocally(buffer, mimetype) {
  const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const extension = extensions[mimetype];
  if (!extension) throw new ApiError(400, "Only JPG, PNG or WebP images are allowed");
  const filename = `${randomUUID()}.${extension}`;
  await mkdir(uploadsDirectory, { recursive: true });
  await writeFile(path.join(uploadsDirectory, filename), buffer);
  return {
    url: new URL(`/uploads/${filename}`, env.apiUrl).toString(),
    publicId: `local:${filename}`,
  };
}

function upload(buffer, folder, transformation) {
  if (!configured) {
    throw new ApiError(
      503,
      "Image upload requires Cloudinary credentials: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET"
    );
  }
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder, resource_type: "image", transformation }, (err, result) =>
        err ? reject(err) : resolve({ url: result.secure_url, publicId: result.public_id })
      )
      .end(buffer);
  });
}

// Avatars: square crop around the face
export const uploadImage = (buffer, folder, mimetype) => {
  if (!configured && !env.isProd) return uploadImageLocally(buffer, mimetype);
  return upload(buffer, folder, [{ width: 400, height: 400, crop: "fill", gravity: "face" }]);
};

// Product photos: keep the whole image, cap the size, auto quality/format
export const uploadProductImage = (buffer, mimetype) => {
  if (!configured && !env.isProd) return uploadImageLocally(buffer, mimetype);
  return upload(buffer, "ecommerce/products", [
    { width: 1200, height: 1200, crop: "limit", quality: "auto", fetch_format: "auto" },
  ]);
};

export const uploadReviewImage = (buffer, mimetype) => {
  if (!configured && !env.isProd) return uploadImageLocally(buffer, mimetype);
  return upload(buffer, "ecommerce/reviews", [
    { width: 1200, height: 1200, crop: "limit", quality: "auto", fetch_format: "auto" },
  ]);
};

export async function deleteImage(publicId) {
  if (!publicId) return;
  if (publicId.startsWith("local:")) {
    const filename = publicId.slice("local:".length);
    if (path.basename(filename) !== filename) throw new Error("Invalid local image identifier");
    await rm(path.join(uploadsDirectory, filename), { force: true });
    return;
  }
  if (!configured) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Cloudinary delete failed:", err.message);
  }
}
