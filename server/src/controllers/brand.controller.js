import Brand from "../models/Brand.js";
import Product from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { slugify } from "../utils/slugify.js";

// PUBLIC: active brands (for filters)
export const listBrands = asyncHandler(async (req, res) => {
  const brands = await Brand.find({ isActive: true }).sort({ name: 1 }).select("name slug logo").lean();
  res.json({ success: true, data: { brands } });
});

// ADMIN: all brands
export const adminListBrands = asyncHandler(async (req, res) => {
  const brands = await Brand.find().sort({ name: 1 }).lean();
  res.json({ success: true, data: { brands } });
});

export const createBrand = asyncHandler(async (req, res) => {
  const slug = slugify(req.body.name);
  if (!slug) throw new ApiError(400, "Enter a valid name");
  if (await Brand.exists({ slug })) throw new ApiError(409, "A brand with this name already exists");

  const brand = await Brand.create({ ...req.body, slug });
  res.status(201).json({ success: true, data: { brand } });
});

export const updateBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new ApiError(404, "Brand not found");

  const { name, ...rest } = req.body;
  if (name !== undefined && name !== brand.name) {
    const slug = slugify(name);
    if (await Brand.exists({ slug, _id: { $ne: brand._id } })) {
      throw new ApiError(409, "A brand with this name already exists");
    }
    brand.name = name;
    brand.slug = slug;
  }
  Object.assign(brand, rest);
  await brand.save();

  res.json({ success: true, data: { brand } });
});

export const deleteBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new ApiError(404, "Brand not found");

  const productCount = await Product.countDocuments({ brand: brand._id });
  if (productCount > 0) {
    throw new ApiError(400, `${productCount} product(s) use this brand. Change them first.`);
  }

  await brand.deleteOne();
  res.json({ success: true, message: "Brand deleted" });
});
