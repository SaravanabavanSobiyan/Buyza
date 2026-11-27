import Product from "../models/Product.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HOME_LIMIT, HOME_SECTIONS, toCard } from "../services/catalog.service.js";

const findSection = ({ filter, sort }) =>
  Product.find(filter)
    .sort(sort)
    .limit(HOME_LIMIT)
    .select("name slug price salePrice images stock lowStockThreshold category ratingAvg ratingCount")
    .populate("category", "name slug")
    .lean();

export const getHome = asyncHandler(async (req, res) => {
  const [featured, newArrivals, bestSellers] = await Promise.all([
    findSection(HOME_SECTIONS.featured),
    findSection(HOME_SECTIONS.newArrivals),
    findSection(HOME_SECTIONS.bestSellers),
  ]);
  const bestSellersAreFallback = bestSellers.length === 0;
  const popularPicks = bestSellersAreFallback ? await findSection(HOME_SECTIONS.popularPicks) : bestSellers;

  res.set("Cache-Control", env.isProd ? "public, max-age=60" : "no-cache");

  res.json({
    success: true,
    data: {
      featured: featured.map(toCard),
      newArrivals: newArrivals.map(toCard),
      bestSellers: popularPicks.map(toCard),
      bestSellersAreFallback,
    },
  });
});
