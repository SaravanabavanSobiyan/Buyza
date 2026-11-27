import { z } from "zod";
import { checkoutAddressSchema } from "./checkout.validators.js";
import { CANCEL_REASONS } from "../constants/order.js";

const objectId = z
  .string({ message: "Invalid ID" })
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID")
  .transform((value) => value.toLowerCase());

const guestItemsSchema = z
  .array(
    z.object({
      productId: objectId,
      variantSku: z.string().trim().min(1).nullish().transform((value) => value ?? null),
      quantity: z
        .number({ message: "Quantity is required" })
        .int("Quantity must be a whole number")
        .min(1, "Quantity must be at least 1")
        .max(10, "Quantity can be at most 10"),
    })
  )
  .max(50, "You can order up to 50 cart lines");

export const placeOrderSchema = z
  .object({
    address: checkoutAddressSchema.optional(),
    addressId: objectId.optional(),
    email: z.string().trim().email("Enter a valid email address").max(254).optional(),
    items: guestItemsSchema.optional(),
    buyNow: z.boolean().optional().default(false),
    shippingMethodId: objectId,
    paymentMethod: z.enum(["cod"], { message: "Only cash on delivery is available" }),
  })
  .superRefine((value, context) => {
    if (value.addressId && value.address) {
      context.addIssue({
        code: "custom",
        path: ["address"],
        message: "Provide either a saved address ID or an address, not both",
      });
    }
    if (value.buyNow && value.items?.length !== 1) {
      context.addIssue({
        code: "custom",
        path: ["items"],
        message: "Buy now checkout requires exactly one item",
      });
    }
  });

export const cancelOrderSchema = z.object({
  reason: z.enum(CANCEL_REASONS),
  note: z.string().trim().max(300).optional(),
});
