import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";

const MAX_ITEMS = 200;

const ensureWishlistCount = async (userId) => {
  const initialized = await User.exists({ _id: userId, wishlistCount: { $exists: true } });
  if (initialized) return;

  const count = await Wishlist.countDocuments({ user: userId });
  await User.updateOne(
    { _id: userId, wishlistCount: { $exists: false } },
    { $set: { wishlistCount: count } }
  );
};

export const addToWishlist = async (userId, productId) => {
  const product = await Product.findOne({
    _id: productId,
    isActive: true,
    isDeleted: { $ne: true },
  }).select("_id");
  if (!product) throw new ApiError(404, "Product not found");

  await ensureWishlistCount(userId);
  await cleanStale(userId);

  const already = await Wishlist.exists({ user: userId, product: productId });
  if (already) return { productId, saved: true };

  const reservation = await User.updateOne(
    { _id: userId, wishlistCount: { $lt: MAX_ITEMS } },
    { $inc: { wishlistCount: 1 } }
  );
  if (reservation.modifiedCount === 0) {
    if (await Wishlist.exists({ user: userId, product: productId })) return { productId, saved: true };
    throw new ApiError(400, `Your wishlist is full (max ${MAX_ITEMS} items)`);
  }

  try {
    await Wishlist.updateOne(
      { user: userId, product: productId },
      { $setOnInsert: { user: userId, product: productId } },
      { upsert: true }
    );
  } catch (err) {
    await User.updateOne({ _id: userId }, { $inc: { wishlistCount: -1 } });
    if (err.code !== 11000) throw err;
  }

  return { productId, saved: true };
};

export const removeFromWishlist = async (userId, productId) => {
  await ensureWishlistCount(userId);
  const result = await Wishlist.deleteOne({ user: userId, product: productId });
  if (result.deletedCount) {
    await User.updateOne({ _id: userId }, { $inc: { wishlistCount: -1 } });
  }
  return { productId, saved: false };
};

export const getWishlistIds = async (userId) => {
  await ensureWishlistCount(userId);
  await cleanStale(userId);
  const rows = await Wishlist.find({ user: userId }).select("product").lean();
  return rows.map((row) => String(row.product));
};

const cleanStale = async (userId) => {
  const rows = await Wishlist.find({ user: userId }).select("product").lean();
  if (rows.length === 0) return;

  const alive = await Product.find({
    _id: { $in: rows.map((row) => row.product) },
    isActive: true,
    isDeleted: { $ne: true },
  })
    .select("_id")
    .lean();

  const aliveIds = new Set(alive.map((product) => String(product._id)));
  const staleRowIds = rows.filter((row) => !aliveIds.has(String(row.product))).map((row) => row._id);

  if (staleRowIds.length) {
    const result = await Wishlist.deleteMany({ _id: { $in: staleRowIds } });
    if (result.deletedCount) {
      await User.updateOne({ _id: userId }, { $inc: { wishlistCount: -result.deletedCount } });
    }
  }
};

export const listWishlist = async ({ userId, page, limit }) => {
  await ensureWishlistCount(userId);
  await cleanStale(userId);

  const filter = { user: userId };
  const total = await Wishlist.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(page, totalPages);

  const rows = await Wishlist.find(filter)
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * limit)
    .limit(limit)
    .populate({ path: "product", select: "name slug images price salePrice stock isActive variants" })
    .lean();

  const items = rows
    .filter((row) => row.product)
    .map((row) => {
      const product = row.product;
      const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
      const regularPrice = hasVariants
        ? Math.min(...product.variants.map((variant) => variant.price ?? product.price))
        : product.price;
      const isOnSale = !hasVariants && product.salePrice != null && product.salePrice < regularPrice;
      return {
        productId: String(product._id),
        name: product.name,
        slug: product.slug,
        image: product.images?.[0]?.url || null,
        hasVariants,
        price: isOnSale ? product.salePrice : regularPrice,
        compareAtPrice: isOnSale ? regularPrice : null,
        inStock: hasVariants ? product.variants.some((variant) => variant.stock > 0) : product.stock > 0,
        addedAt: row.createdAt,
      };
    });

  return {
    items,
    page: currentPage,
    limit,
    total,
    totalPages,
  };
};
