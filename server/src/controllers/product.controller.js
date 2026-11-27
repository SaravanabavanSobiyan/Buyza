import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Brand from "../models/Brand.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { slugify } from "../utils/slugify.js";
import { uniqueSlug } from "../utils/uniqueSlug.js";
import { uploadProductImage, deleteImage } from "../services/cloudinary.service.js";
import { stockSnapshot, diffSnapshots, recordMovements } from "../services/inventory.service.js";
import { audit } from "../services/audit.service.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function assertRefs({ category, brand }) {
  if (category && !(await Category.exists({ _id: category }))) throw new ApiError(400, "Category not found");
  if (brand && !(await Brand.exists({ _id: brand }))) throw new ApiError(400, "Brand not found");
}

// SKUs must be unique inside the product and across all (non-deleted) products
async function assertUniqueSkus({ sku, variants = [] }, excludeId) {
  const skus = [sku, ...variants.map((v) => v.sku)].filter(Boolean).map((s) => s.toLowerCase());
  if (new Set(skus).size !== skus.length) throw new ApiError(400, "SKUs must be unique");
  if (!skus.length) return;

  const skuPatterns = skus.map((value) => new RegExp(`^${escapeRegex(value)}$`, "i"));
  const clash = await Product.findOne({
    isDeleted: false,
    ...(excludeId && { _id: { $ne: excludeId } }),
    $or: [{ sku: { $in: skuPatterns } }, { "variants.sku": { $in: skuPatterns } }],
  }).select("name");
  if (clash) throw new ApiError(409, `A SKU is already used by "${clash.name}"`);
}

export const listProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true, isDeleted: { $ne: true } })
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(24)
    .select("name slug description price salePrice images category brand stock isFeatured")
    .populate("category", "name slug")
    .populate("brand", "name")
    .lean();

  res.json({ success: true, data: { products } });
});

export const listAdminProducts = asyncHandler(async (req, res) => {
  const { search, category, brand, status, stock, page, limit } = req.query;

  const filter = { isDeleted: false };
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: rx }, { sku: rx }, { "variants.sku": rx }];
  }
  if (category) filter.category = category;
  if (brand) filter.brand = brand;
  if (status === "active") filter.isActive = true;
  if (status === "draft") filter.isActive = false;
  if (stock === "out") filter.stock = 0;
  if (stock === "low") {
    filter.$expr = {
      $or: [
        { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$lowStockThreshold"] }] },
        {
          $anyElementTrue: {
            $map: {
              input: { $ifNull: ["$variants", []] },
              as: "variant",
              in: {
                $and: [
                  { $gt: ["$$variant.stock", 0] },
                  { $lte: ["$$variant.stock", "$lowStockThreshold"] },
                ],
              },
            },
          },
        },
      ],
    };
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("name slug sku price images stock lowStockThreshold variants.sku variants.stock isActive isFeatured category brand createdAt")
      .populate("category", "name")
      .populate("brand", "name")
      .lean(),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { products, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } },
  });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isDeleted: false }).lean();
  if (!product) throw new ApiError(404, "Product not found");
  res.json({ success: true, data: { product } });
});

export const createProduct = asyncHandler(async (req, res) => {
  const body = req.body;
  await assertRefs(body);
  await assertUniqueSkus(body);

  const slug = await uniqueSlug(Product, body.slug || body.name);
  const product = await Product.create({ ...body, slug });

  await recordMovements({
    product,
    entries: diffSnapshots([], stockSnapshot(product)),
    userId: req.user._id,
  });
  await audit(req, {
    action: "product.created",
    entityType: "product",
    entityId: product._id,
    summary: `Created product "${product.name}"`,
  });

  res.status(201).json({ success: true, data: { product } });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isDeleted: false });
  if (!product) throw new ApiError(404, "Product not found");

  const before = stockSnapshot(product);
  const { slug: slugInput, ...fields } = req.body;
  const salePrice = fields.salePrice === undefined ? product.salePrice : fields.salePrice;
  const price = fields.price === undefined ? product.price : fields.price;
  if (salePrice != null && salePrice >= price) {
    throw new ApiError(400, "Sale price must be less than the regular price");
  }
  await assertRefs(fields);
  await assertUniqueSkus(
    { sku: fields.sku ?? product.sku, variants: fields.variants ?? product.variants },
    product._id
  );

  const wanted = slugInput ? slugify(slugInput) : "";
  if (wanted && wanted !== product.slug) {
    if (await Product.exists({ slug: wanted, _id: { $ne: product._id } })) {
      throw new ApiError(409, "That URL slug is already used by another product");
    }
    product.slug = wanted;
  }

  const oldPublicIds = product.images.map((i) => i.publicId);
  Object.assign(product, fields);
  await product.save();

  const after = stockSnapshot(product);
  const stockEntries = diffSnapshots(before, after);
  if (stockEntries.length) {
    await recordMovements({ product, entries: stockEntries, userId: req.user._id });
  }

  // delete images the admin removed from the product
  if (fields.images) {
    const keep = new Set(fields.images.map((i) => i.publicId));
    await Promise.all(oldPublicIds.filter((id) => !keep.has(id)).map(deleteImage));
  }

  await audit(req, {
    action: "product.updated",
    entityType: "product",
    entityId: product._id,
    summary: `Updated product "${product.name}"`,
    meta: { fields: Object.keys(fields), stockChanges: stockEntries.length },
  });

  res.json({ success: true, data: { product } });
});

// Soft delete: the product disappears from the store and admin list but the record is kept
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isDeleted: false });
  if (!product) throw new ApiError(404, "Product not found");

  product.isDeleted = true;
  product.isActive = false;
  await product.save();
  await audit(req, {
    action: "product.deleted",
    entityType: "product",
    entityId: product._id,
    summary: `Deleted product "${product.name}"`,
  });
  res.json({ success: true, message: "Product deleted" });
});

export const uploadImages = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw new ApiError(400, "Choose at least one image");
  const images = await Promise.all(req.files.map((f) => uploadProductImage(f.buffer, f.mimetype)));
  res.status(201).json({ success: true, data: { images } });
});
