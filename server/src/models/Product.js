import mongoose from "mongoose";
import { slugify } from "../utils/slugify.js";

const variantSchema = new mongoose.Schema({
  sku: { type: String, required: true, trim: true },
  attributes: { type: mongoose.Schema.Types.Mixed, default: {} }, // { size: "M", color: "Black" }
  price: { type: Number, min: 0 }, // optional price override (minor units)
  stock: { type: Number, default: 0, min: 0 },
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 }, // minor units: 1290000 = LKR 12,900.00
    salePrice: { type: Number, min: 0 },
    sku: { type: String, trim: true, default: "" },
    images: [{ _id: false, url: String, publicId: String }], // first image is the main one
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", index: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", index: true },
    tags: [String],
    stock: { type: Number, default: 0, min: 0 }, // with variants this is the sum of variant stock
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    variants: [variantSchema],
    seo: {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
    },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    ratingBreakdown: {
      1: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      5: { type: Number, default: 0 },
    },
    soldCount: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }, // false = draft, hidden from the store
    isDeleted: { type: Boolean, default: false }, // soft delete
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ isActive: 1, isDeleted: 1, createdAt: -1 });
productSchema.index({ isActive: 1, isDeleted: 1, category: 1, price: 1 });
productSchema.index({ isActive: 1, isDeleted: 1, isFeatured: 1, createdAt: -1 });
productSchema.index({ isActive: 1, isDeleted: 1, soldCount: -1 });
productSchema.index({ ratingAvg: -1 });

productSchema.pre("validate", function (next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  if (this.variants?.length) {
    this.stock = this.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  }
  next();
});

export default mongoose.model("Product", productSchema);
