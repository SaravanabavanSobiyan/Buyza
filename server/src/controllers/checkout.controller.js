import { asyncHandler } from "../utils/asyncHandler.js";
import { createCheckoutQuote } from "../services/checkout.service.js";

export const quoteCheckout = asyncHandler(async (req, res) => {
  const quote = await createCheckoutQuote(req.user || null, req.body);
  res.json({ success: true, quote });
});
