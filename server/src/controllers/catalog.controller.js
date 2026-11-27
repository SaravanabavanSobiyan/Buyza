import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Brand from "../models/Brand.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildMatch, buildListingPipeline, resolveSort, toCard, toProductDetail } from "../services/catalog.service.js";

async function categoryScope(slug) {
  const category = await Category.findOne({ slug, isActive: true }).select("_id parent");
  if (!category) throw new ApiError(404, "Category not found");

  if (category.parent) {
    const parent = await Category.exists({ _id: category.parent, isActive: true });
    if (!parent) throw new ApiError(404, "Category not found");
    return [category._id];
  }

  const children = await Category.find({ parent: category._id, isActive: true }).select("_id");
  return [category._id, ...children.map((child) => child._id)];
}

export const listPublicProducts = asyncHandler(async (req, res) => {
  const { category, brand, minPrice, maxPrice, inStock, deals, featured, page, limit } = req.query;
  const search = req.query.search?.trim() || "";

  const categoryIds = category ? await categoryScope(category) : undefined;

  let brandIds;
  if (brand) {
    const brands = await Brand.find({ slug: { $in: brand.split(",") }, isActive: true }).select("_id");
    brandIds = brands.map((item) => item._id);
  }

  const sort = resolveSort(req.query.sort, search);
  const match = buildMatch({ categoryIds, brandIds, minPrice, maxPrice, inStock, featured, search });

  if (deals === "true") {
    match.$expr = { $and: [{ $gt: ["$salePrice", 0] }, { $lt: ["$salePrice", "$price"] }] };
  }

  let aggregate = Product.aggregate(buildListingPipeline({ match, sort, search, page, limit }));
  if (sort === "name_asc") aggregate = aggregate.collation({ locale: "en", strength: 2 });

  const [result] = await aggregate;
  const total = result?.total[0]?.n || 0;

  res.json({
    success: true,
    data: {
      products: (result?.items || []).map(toCard),
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    },
  });
});

export const getPublicProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true, isDeleted: false })
    .select(
      "name slug description price sku images stock lowStockThreshold variants brand category seo ratingAvg ratingCount ratingBreakdown"
    )
    .populate("brand", "name slug isActive")
    .populate("category", "name slug parent isActive")
    .lean();
  if (!product) throw new ApiError(404, "Product not found");

  const brand = product.brand?.isActive ? { name: product.brand.name, slug: product.brand.slug } : null;
  let category = null;
  let parent = null;

  if (product.category?.isActive) {
    category = { name: product.category.name, slug: product.category.slug };
    if (product.category.parent) {
      const activeParent = await Category.findOne({
        _id: product.category.parent,
        isActive: true,
      })
        .select("name slug")
        .lean();
      if (activeParent) parent = { name: activeParent.name, slug: activeParent.slug };
      else category = null;
    }
  }

  res.json({ success: true, data: { product: toProductDetail(product, { brand, category, parent }) } });
});
