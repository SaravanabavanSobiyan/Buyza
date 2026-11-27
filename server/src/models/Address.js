import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    label: { type: String, trim: true, default: "" },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true, default: "" },
    city: { type: String, required: true, trim: true },
    province: { type: String, trim: true, default: "" },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, trim: true, default: "Sri Lanka" },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

addressSchema.index({ user: 1, createdAt: -1 });

// Database-level guarantee: only one default address per user
addressSchema.index({ user: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });

export default mongoose.model("Address", addressSchema);
