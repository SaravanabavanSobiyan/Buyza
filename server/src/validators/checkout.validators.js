import { z } from "zod";
import { SRI_LANKAN_PROVINCES } from "../utils/sriLankaProvinces.js";

const objectId = z
  .string({ message: "Invalid ID" })
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID")
  .transform((value) => value.toLowerCase());

const checkoutAddressSchema = z.object({
  fullName: z.string({ message: "Enter the recipient's name" }).trim().min(2, "Enter the recipient's name").max(80),
  phone: z.string({ message: "Enter a valid phone number" }).trim().regex(/^\+?\d[\d\s-]{6,19}$/, "Enter a valid phone number"),
  line1: z.string({ message: "Enter the street address" }).trim().min(3, "Enter the street address").max(120),
  line2: z.string().trim().max(120).optional().default(""),
  city: z.string({ message: "Enter the city" }).trim().min(2, "Enter the city").max(60),
  province: z.string({ message: "Choose a valid Sri Lankan province" }).trim().pipe(
    z.enum(SRI_LANKAN_PROVINCES, { message: "Choose a valid Sri Lankan province" })
  ),
  postalCode: z.string({ message: "Enter the postal code" }).trim().min(3, "Enter the postal code").max(12),
  country: z
    .string({ message: "Enter the country" })
    .trim()
    .refine((value) => value.toLowerCase() === "sri lanka", "Delivery is available in Sri Lanka only")
    .transform(() => "Sri Lanka"),
});

const guestItemsSchema = z
  .array(
    z.object({
      productId: objectId,
      variantSku: z.string().trim().min(1).nullish().transform((value) => value ?? null),
      quantity: z.number({ message: "Quantity is required" }).int("Quantity must be a whole number").min(1, "Quantity must be at least 1").max(10, "Quantity can be at most 10"),
    })
  )
  .max(50, "You can quote up to 50 cart lines");

export const checkoutQuoteSchema = z
  .object({
    addressId: objectId.optional(),
    address: checkoutAddressSchema.optional(),
    email: z.string().trim().email("Enter a valid email address").max(254).optional(),
    items: guestItemsSchema.optional(),
    buyNow: z.boolean().optional().default(false),
    shippingMethodId: objectId.optional(),
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

export { checkoutAddressSchema };
