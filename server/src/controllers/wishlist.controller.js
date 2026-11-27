import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import * as service from "../services/wishlist.service.js";

const HEX_ID = /^[0-9a-fA-F]{24}$/;

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const productIdParam = (req) => {
  if (!HEX_ID.test(req.params.productId)) throw new ApiError(404, "Product not found");
  return req.params.productId;
};

export const list = asyncHandler(async (req, res) => {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, "Invalid page or limit");
  const data = await service.listWishlist({ userId: req.user._id, ...parsed.data });
  res.json({ success: true, ...data });
});

export const ids = asyncHandler(async (req, res) => {
  const list = await service.getWishlistIds(req.user._id);
  res.json({ success: true, ids: list });
});

export const add = asyncHandler(async (req, res) => {
  const result = await service.addToWishlist(req.user._id, productIdParam(req));
  res.json({ success: true, ...result });
});

export const remove = asyncHandler(async (req, res) => {
  const result = await service.removeFromWishlist(req.user._id, productIdParam(req));
  res.json({ success: true, ...result });
});
