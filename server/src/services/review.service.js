import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Review from "../models/Review.js";
import { MAX_PHOTOS, REVIEWABLE_STATUSES } from "../constants/review.js";
import { ApiError } from "../utils/ApiError.js";
import { deleteReviewPhotos, uploadReviewPhotos } from "../utils/reviewUpload.js";

const SORTS = {
  newest: { createdAt: -1 },
  highest: { rating: -1, createdAt: -1 },
  lowest: { rating: 1, createdAt: -1 },
};

const displayName = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Customer";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
};

export const toPublicReview = (r, author, own = false) => ({
  _id: r._id,
  rating: r.rating,
  title: r.title,
  body: r.body,
  photos: (r.photos || []).map((p) => (own ? { url: p.url, publicId: p.publicId } : { url: p.url })),
  author,
  verified: true,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

const ensureProduct = async (productId) => {
  const exists = await Product.exists({ _id: productId, isActive: true, isDeleted: false });
  if (!exists) throw new ApiError(404, "Product not found");
};

const findPurchaseOrder = (userId, productId) =>
  Order.findOne({
    user: userId,
    status: { $in: REVIEWABLE_STATUSES },
    "items.product": productId,
  })
    .sort({ createdAt: -1 })
    .select("_id")
    .lean();

export const recalcProductRating = async (productId) => {
  const rows = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), status: "approved" } },
    { $group: { _id: "$rating", count: { $sum: 1 } } },
  ]);

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let count = 0;
  let sum = 0;

  rows.forEach((row) => {
    breakdown[row._id] = row.count;
    count += row.count;
    sum += row._id * row.count;
  });

  const average = count ? Math.round((sum / count) * 10) / 10 : 0;

  await Product.updateOne(
    { _id: productId },
    { $set: { ratingAvg: average, ratingCount: count, ratingBreakdown: breakdown } }
  );

  return { average, count, breakdown };
};

export const checkEligibility = async (userId, productId) => {
  await ensureProduct(productId);

  const mine = await Review.findOne({ product: productId, user: userId }).lean();
  if (mine) {
    return { canReview: false, reason: "already_reviewed", myReview: toPublicReview(mine, "You", true) };
  }

  const order = await findPurchaseOrder(userId, productId);
  if (!order) return { canReview: false, reason: "not_purchased", myReview: null };

  return { canReview: true, reason: null, myReview: null };
};

export const listReviews = async ({ productId, page, limit, sort }) => {
  const product = await Product.findOne({ _id: productId, isActive: true, isDeleted: false })
    .select("ratingAvg ratingCount ratingBreakdown")
    .lean();
  if (!product) throw new ApiError(404, "Product not found");

  const filter = { product: productId, status: "approved" };
  const [total, rows] = await Promise.all([
    Review.countDocuments(filter),
    Review.find(filter)
      .sort(SORTS[sort] || SORTS.newest)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: "user", select: "name" })
      .lean(),
  ]);

  return {
    reviews: rows.map((r) => toPublicReview(r, displayName(r.user?.name))),
    summary: {
      average: product.ratingAvg ?? 0,
      count: product.ratingCount ?? 0,
      breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, ...(product.ratingBreakdown || {}) },
    },
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};

export const createReview = async ({ userId, productId, data, files }) => {
  await ensureProduct(productId);

  const order = await findPurchaseOrder(userId, productId);
  if (!order) throw new ApiError(403, "Only customers who received this product can review it");

  if (await Review.exists({ product: productId, user: userId })) {
    throw new ApiError(409, "You already reviewed this product");
  }

  const photos = await uploadReviewPhotos(files);
  let review;
  try {
    review = await Review.create({
      product: productId,
      user: userId,
      order: order._id,
      rating: data.rating,
      title: data.title,
      body: data.body,
      photos,
    });
  } catch (err) {
    await deleteReviewPhotos(photos);
    if (err.code === 11000) throw new ApiError(409, "You already reviewed this product");
    throw err;
  }
  await recalcProductRating(productId);
  return review;
};

export const updateReview = async ({ userId, productId, reviewId, data, keepPhotoIds, files }) => {
  const review = await Review.findOne({ _id: reviewId, product: productId, user: userId });
  if (!review) throw new ApiError(404, "Review not found");

  const keep = keepPhotoIds ? review.photos.filter((p) => keepPhotoIds.includes(p.publicId)) : [...review.photos];
  const removed = review.photos.filter((p) => !keep.some((k) => k.publicId === p.publicId));

  if (keep.length + files.length > MAX_PHOTOS) {
    throw new ApiError(400, `You can have up to ${MAX_PHOTOS} photos`);
  }

  const newPhotos = await uploadReviewPhotos(files);
  try {
    review.rating = data.rating;
    review.title = data.title;
    review.body = data.body;
    review.photos = [...keep.map((p) => ({ url: p.url, publicId: p.publicId })), ...newPhotos];
    await review.save();
  } catch (err) {
    await deleteReviewPhotos(newPhotos);
    throw err;
  }

  await deleteReviewPhotos(removed);
  await recalcProductRating(productId);
  return review;
};

export const deleteReview = async ({ userId, productId, reviewId }) => {
  const review = await Review.findOneAndDelete({ _id: reviewId, product: productId, user: userId });
  if (!review) throw new ApiError(404, "Review not found");

  await deleteReviewPhotos(review.photos);
  await recalcProductRating(productId);
};
