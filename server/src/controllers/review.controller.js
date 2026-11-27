import { z } from "zod";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as service from "../services/review.service.js";

const HEX_ID = /^[0-9a-fA-F]{24}$/;

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sort: z.enum(["newest", "highest", "lowest"]).default("newest"),
});

const hexParam = (value, message) => {
  if (!HEX_ID.test(value)) throw new ApiError(404, message);
  return value;
};

const parseKeepIds = (raw) => {
  if (raw === undefined) return undefined;
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.every((x) => typeof x === "string")) return arr;
  } catch {
    // fall through
  }
  throw new ApiError(400, "Invalid keepPhotoIds");
};

export const list = asyncHandler(async (req, res) => {
  const productId = hexParam(req.params.productId, "Product not found");
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, "Invalid page, limit or sort");
  const data = await service.listReviews({ productId, ...parsed.data });
  res.json({ success: true, ...data });
});

export const eligibility = asyncHandler(async (req, res) => {
  const productId = hexParam(req.params.productId, "Product not found");
  const data = await service.checkEligibility(req.user._id, productId);
  res.json({ success: true, ...data });
});

export const create = asyncHandler(async (req, res) => {
  const productId = hexParam(req.params.productId, "Product not found");
  const { rating, title, body } = req.body;
  const review = await service.createReview({
    userId: req.user._id,
    productId,
    data: { rating, title, body },
    files: req.files || [],
  });
  res.status(201).json({ success: true, review: service.toPublicReview(review, "You", true) });
});

export const update = asyncHandler(async (req, res) => {
  const productId = hexParam(req.params.productId, "Product not found");
  const reviewId = hexParam(req.params.reviewId, "Review not found");
  const { rating, title, body, keepPhotoIds } = req.body;
  const review = await service.updateReview({
    userId: req.user._id,
    productId,
    reviewId,
    data: { rating, title, body },
    keepPhotoIds: parseKeepIds(keepPhotoIds),
    files: req.files || [],
  });
  res.json({ success: true, review: service.toPublicReview(review, "You", true) });
});

export const remove = asyncHandler(async (req, res) => {
  const productId = hexParam(req.params.productId, "Product not found");
  const reviewId = hexParam(req.params.reviewId, "Review not found");
  await service.deleteReview({ userId: req.user._id, productId, reviewId });
  res.json({ success: true });
});
