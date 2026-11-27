import Product from "../models/Product.js";
import StockMovement from "../models/StockMovement.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { formatAttributes, recordMovements, inventoryRowStages } from "../services/inventory.service.js";
import { audit } from "../services/audit.service.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const listInventory = asyncHandler(async (req, res) => {
  const { search, status, page, limit } = req.query;

  const match = {};
  if (status !== "all") match.status = status;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    match.$or = [{ name: rx }, { sku: rx }];
  }

  const [result] = await Product.aggregate([
    ...inventoryRowStages(),
    ...(Object.keys(match).length ? [{ $match: match }] : []),
    { $sort: { rank: 1, name: 1, sku: 1 } },
    {
      $facet: {
        rows: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        total: [{ $count: "n" }],
      },
    },
  ]);

  const total = result?.total[0]?.n || 0;
  res.json({
    success: true,
    data: {
      rows: result?.rows || [],
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    },
  });
});

export const getStockAlerts = asyncHandler(async (req, res) => {
  const counts = await Product.aggregate([...inventoryRowStages(), { $group: { _id: "$status", n: { $sum: 1 } } }]);
  const byStatus = Object.fromEntries(counts.map((count) => [count._id, count.n]));

  res.json({ success: true, data: { low: byStatus.low || 0, out: byStatus.out || 0 } });
});

export const getStockHistory = asyncHandler(async (req, res) => {
  const { productId, sku, page, limit } = req.query;
  const filter = {};

  if (productId) filter.product = productId;
  if (sku) filter.sku = sku;

  const [movements, total] = await Promise.all([
    StockMovement.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "name")
      .lean(),
    StockMovement.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      movements,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    },
  });
});

export const adjustStock = asyncHandler(async (req, res) => {
  const { productId, sku, mode, quantity, reason, note } = req.body;

  for (let attempt = 0; attempt < 3; attempt++) {
    const product = await Product.findOne({ _id: productId, isDeleted: false }).select("name sku stock variants lowStockThreshold");
    if (!product) throw new ApiError(404, "Product not found");

    const hasVariants = Boolean(product.variants?.length);
    let current;
    let entrySku;
    let label = "";

    if (hasVariants) {
      if (!sku) throw new ApiError(400, "Choose which variant to adjust");
      const variant = product.variants.find((entry) => entry.sku === sku);
      if (!variant) throw new ApiError(404, "Variant not found");
      current = variant.stock;
      entrySku = variant.sku;
      label = formatAttributes(variant.attributes);
    } else {
      current = product.stock;
      entrySku = product.sku || "";
    }

    const next = mode === "add" ? current + quantity : mode === "remove" ? current - quantity : quantity;
    if (next < 0) throw new ApiError(400, `You can't remove ${quantity}. Only ${current} in stock.`);

    const change = next - current;
    if (change === 0) throw new ApiError(400, `Stock is already ${current}`);

    const filter = hasVariants
      ? { _id: product._id, variants: { $elemMatch: { sku: entrySku, stock: current } } }
      : { _id: product._id, stock: current };

    const update = hasVariants ? { $inc: { stock: change, "variants.$.stock": change } } : { $inc: { stock: change } };
    const result = await Product.updateOne(filter, update);

    if (result.modifiedCount === 1) {
      await recordMovements({
        product,
        entries: [{ sku: entrySku, label, change, stockAfter: next, reason, note }],
        userId: req.user._id,
      });
      await audit(req, {
        action: "inventory.stock_updated",
        entityType: "product",
        entityId: product._id,
        summary: `Stock of "${product.name}" changed from ${current} to ${next}`,
        meta: { from: current, to: next, sku: entrySku || null, reason, note: note || undefined },
      });
      return res.json({ success: true, data: { sku: entrySku, stock: next, change } });
    }
  }

  throw new ApiError(409, "Stock was changed by someone else. Please try again.");
});
