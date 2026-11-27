import { Router } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

const router = Router();

export const healthCheck = asyncHandler(async (_req, res) => {
  const database = mongoose.connection.db;
  if (mongoose.connection.readyState !== 1 || !database) {
    throw new ApiError(503, "Service unavailable");
  }

  try {
    await database.admin().ping();
  } catch (error) {
    console.error("[health] database ping failed:", error.message);
    throw new ApiError(503, "Service unavailable");
  }

  res.json({ status: "ok" });
});

router.get("/", healthCheck);

export default router;
