import mongoose from "mongoose";

const { Schema } = mongoose;

const orderItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  slug: { type: String, default: "" },
  image: { type: String, default: null },
  variantSku: { type: String, default: null },
  unitPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  lineTotal: { type: Number, required: true, min: 0 },
});

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    email: { type: String, required: true, lowercase: true, trim: true },
    items: { type: [orderItemSchema], required: true },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      line1: { type: String, required: true },
      line2: { type: String, default: "" },
      city: { type: String, required: true },
      province: { type: String, required: true },
      postalCode: { type: String, required: true },
    },
    shippingMethod: {
      methodId: { type: String, required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true, min: 0 },
      etaMin: { type: Schema.Types.Mixed, default: null },
      etaMax: { type: Schema.Types.Mixed, default: null },
    },
    payment: {
      method: { type: String, enum: ["cod", "card"], required: true },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refund_pending", "refunded"],
        default: "pending",
      },
      transactionId: { type: String, default: null },
      paidAt: { type: Date, default: null },
    },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: "" },
    cancelNote: { type: String, default: "" },
    statusHistory: [
      {
        status: { type: String, required: true },
        at: { type: Date, default: Date.now },
        note: { type: String, default: "" },
      },
    ],
    idempotencyKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("Order", orderSchema);
