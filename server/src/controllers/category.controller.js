import Category from "../models/Category.js";
import Product from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { slugify } from "../utils/slugify.js";

const order = { sortOrder: 1, name: 1 };

async function assertValidParent(parentId, selfId) {
  if (!parentId) return;
  if (selfId && String(parentId) === String(selfId)) {
    throw new ApiError(400, "A category can't be its own parent");
  }
  const parent = await Category.findById(parentId);
  if (!parent) throw new ApiError(400, "Parent category not found");
  if (parent.parent) throw new ApiError(400, "Categories can only be nested one level deep");
  if (selfId && (await Category.exists({ parent: selfId }))) {
    throw new ApiError(400, "This category has sub-categories, so it can't become a sub-category");
  }
}

export const getCategoryTree = asyncHandler(async (req, res) => {
  const all = await Category.find({ isActive: true }).sort(order).select("name slug parent image").lean();
  const roots = all.filter((category) => !category.parent).map((category) => ({ ...category, children: [] }));
  const byId = new Map(roots.map((root) => [String(root._id), root]));
  all
    .filter((category) => category.parent)
    .forEach((category) => byId.get(String(category.parent))?.children.push(category));

  res.json({ success: true, data: { categories: roots } });
});

export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug, isActive: true })
    .select("name slug parent")
    .lean();
  if (!category) throw new ApiError(404, "Category not found");

  let parent = null;
  if (category.parent) {
    parent = await Category.findOne({ _id: category.parent, isActive: true }).select("name slug").lean();
    if (!parent) throw new ApiError(404, "Category not found");
  }

  const children = await Category.find({ parent: category._id, isActive: true })
    .sort(order)
    .select("name slug")
    .lean();

  res.json({
    success: true,
    data: { category, parent, children },
  });
});

export const adminListCategories = asyncHandler(async (req, res) => {
  const [categories, counts] = await Promise.all([
    Category.find().sort(order).lean(),
    Product.aggregate([
      { $match: { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] } },
      { $group: { _id: "$category", n: { $sum: 1 } } },
    ]),
  ]);
  const countMap = new Map(counts.map((count) => [String(count._id), count.n]));

  res.json({
    success: true,
    data: {
      categories: categories.map((category) => ({
        ...category,
        productCount: countMap.get(String(category._id)) || 0,
      })),
    },
  });
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, parent = null, ...rest } = req.body;
  await assertValidParent(parent);

  const slug = slugify(name);
  if (!slug) throw new ApiError(400, "Enter a valid name");
  if (await Category.exists({ slug })) {
    throw new ApiError(409, "A category with this name already exists");
  }

  const category = await Category.create({ name, slug, parent, ...rest });
  res.status(201).json({ success: true, data: { category } });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, "Category not found");

  const { name, parent, ...rest } = req.body;
  if (parent !== undefined) {
    await assertValidParent(parent, category._id);
    category.parent = parent;
  }
  if (name !== undefined && name !== category.name) {
    const slug = slugify(name);
    if (!slug) throw new ApiError(400, "Enter a valid name");
    if (await Category.exists({ slug, _id: { $ne: category._id } })) {
      throw new ApiError(409, "A category with this name already exists");
    }
    category.name = name;
    category.slug = slug;
  }
  Object.assign(category, rest);
  await category.save();

  res.json({ success: true, data: { category } });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, "Category not found");
  if (await Category.exists({ parent: category._id })) {
    throw new ApiError(400, "Delete or move its sub-categories first");
  }

  const productCount = await Product.countDocuments({ category: category._id, isDeleted: { $ne: true } });
  if (productCount > 0) {
    throw new ApiError(400, `${productCount} product(s) use this category. Move them first.`);
  }

  await category.deleteOne();
  res.json({ success: true, message: "Category deleted" });
});
