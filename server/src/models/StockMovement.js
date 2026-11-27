import mongoose from "mongoose";

export const STOCK_REASONS = ["restock", "return", "damage", "correction", "initial", "other", "sale"];

const stockMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    sku: { type: String, default: "" },
    label: { type: String, default: "" },
    change: { type: Number, required: true },
    stockAfter: { type: Number, required: true, min: 0 },
    reason: { type: String, enum: STOCK_REASONS, required: true },
    note: { type: String, default: "", trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ createdAt: -1 });

export default mongoose.model("StockMovement", stockMovementSchema);
