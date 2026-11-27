import { env } from "../config/env.js";

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || "Server error";

  if (err.name === "CastError") {
    status = 400;
    message = `Invalid ${err.path}`;
  }
  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  }
  if (err.code === 11000) {
    status = 409;
    message = `${Object.keys(err.keyValue).join(", ")} already exists`;
  }
  if (err.name === "MulterError") {
    status = 400;
    if (err.code === "LIMIT_FILE_SIZE") message = "Image is too large";
    else if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") message = "You can upload up to 8 images at a time";
    else message = err.message;
  }
  if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON body";
  }
  if (err.type === "entity.too.large") {
    status = 413;
    message = "Request body is too large";
  }

  if (status === 500) console.error(err);

  res.status(status).json({
    success: false,
    message: status === 500 && env.isProd ? "Something went wrong" : message,
    details: err.details,
    ...(typeof err.code === "string" && { code: err.code }),
    ...(env.nodeEnv === "development" && status === 500 && { stack: err.stack }),
  });
}
