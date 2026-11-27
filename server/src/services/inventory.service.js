import StockMovement from "../models/StockMovement.js";

export const formatAttributes = (attrs) =>
  Object.entries(attrs || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

export function stockSnapshot(product) {
  if (product.variants?.length) {
    return product.variants.map((v) => ({
      sku: v.sku,
      label: formatAttributes(v.attributes),
      stock: v.stock || 0,
    }));
  }

  return [{ sku: product.sku || "", label: "", stock: product.stock || 0 }];
}

export function diffSnapshots(before, after) {
  const beforeMap = new Map(before.map((s) => [s.sku, s]));
  const afterMap = new Map(after.map((s) => [s.sku, s]));
  const entries = [];

  for (const [sku, a] of afterMap) {
    const b = beforeMap.get(sku);
    const previous = b ? b.stock : 0;
    if (a.stock !== previous) {
      entries.push({
        sku,
        label: a.label,
        change: a.stock - previous,
        stockAfter: a.stock,
        reason: b ? "correction" : "initial",
        note: b ? "Edited in product form" : "",
      });
    }
  }

  for (const [sku, b] of beforeMap) {
    if (!afterMap.has(sku) && b.stock !== 0) {
      entries.push({ sku, label: b.label, change: -b.stock, stockAfter: 0, reason: "correction", note: "Variant removed" });
    }
  }

  return entries;
}

export async function recordMovements({ product, entries, userId, session }) {
  const docs = entries
    .filter((entry) => entry.change !== 0)
    .map((entry) => ({
      product: product._id,
      productName: product.name,
      sku: entry.sku,
      label: entry.label || "",
      change: entry.change,
      stockAfter: entry.stockAfter,
      reason: entry.reason,
      note: entry.note || "",
      user: userId,
    }));

  if (docs.length) await StockMovement.insertMany(docs, { session });
}

export const inventoryRowStages = () => [
  { $match: { isDeleted: false } },
  {
    $project: {
      name: 1,
      isActive: 1,
      threshold: "$lowStockThreshold",
      image: { $arrayElemAt: ["$images.url", 0] },
      hasVariants: { $gt: [{ $size: { $ifNull: ["$variants", []] } }, 0] },
      rows: {
        $cond: [
          { $gt: [{ $size: { $ifNull: ["$variants", []] } }, 0] },
          {
            $map: {
              input: "$variants",
              as: "v",
              in: { sku: "$$v.sku", attributes: "$$v.attributes", stock: "$$v.stock" },
            },
          },
          [{ sku: "$sku", attributes: { $literal: {} }, stock: "$stock" }],
        ],
      },
    },
  },
  { $unwind: "$rows" },
  {
    $project: {
      _id: 0,
      productId: "$_id",
      name: 1,
      image: 1,
      isActive: 1,
      threshold: 1,
      hasVariants: 1,
      sku: "$rows.sku",
      attributes: "$rows.attributes",
      stock: "$rows.stock",
    },
  },
  {
    $addFields: {
      status: {
        $switch: {
          branches: [
            { case: { $lte: ["$stock", 0] }, then: "out" },
            { case: { $lte: ["$stock", "$threshold"] }, then: "low" },
          ],
          default: "ok",
        },
      },
    },
  },
  {
    $addFields: {
      rank: {
        $switch: {
          branches: [
            { case: { $eq: ["$status", "out"] }, then: 0 },
            { case: { $eq: ["$status", "low"] }, then: 1 },
          ],
          default: 2,
        },
      },
    },
  },
];
