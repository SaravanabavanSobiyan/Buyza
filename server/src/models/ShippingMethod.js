import mongoose from "mongoose";
import { SRI_LANKAN_PROVINCES } from "../utils/sriLankaProvinces.js";

const priceField = {
  type: Number,
  min: 0,
  validate: {
    validator: (value) => value == null || Number.isInteger(value),
    message: "Price must be a whole number",
  },
};

const provinceRateSchema = new mongoose.Schema(
  {
    province: { type: String, enum: SRI_LANKAN_PROVINCES, required: true },
    price: { ...priceField, required: true },
  },
  { _id: false }
);

const shippingMethodSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    minDeliveryDays: { type: Number, min: 0, required: true, validate: Number.isInteger },
    maxDeliveryDays: { type: Number, min: 0, required: true, validate: Number.isInteger },
    flatPrice: { ...priceField, required: true },
    provinceRates: { type: [provinceRateSchema], default: [] },
    freeShippingThreshold: { ...priceField, default: null },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0, validate: Number.isInteger },
  },
  { timestamps: true }
);

shippingMethodSchema.index({ isActive: 1, sortOrder: 1 });

shippingMethodSchema.pre("validate", function (next) {
  if (this.minDeliveryDays > this.maxDeliveryDays) {
    this.invalidate("maxDeliveryDays", "Maximum delivery days must not be less than minimum delivery days");
  }
  const provinces = this.provinceRates.map((rate) => rate.province);
  if (new Set(provinces).size !== provinces.length) {
    this.invalidate("provinceRates", "Each province can have only one shipping rate");
  }
  next();
});

export default mongoose.model("ShippingMethod", shippingMethodSchema);
