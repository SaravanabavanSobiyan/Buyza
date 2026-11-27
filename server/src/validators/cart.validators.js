import { z } from "zod";

const requiredString = (message) => z.string({ message });

const requiredNumber = (message) => z.number({ message });

const productIdSchema = requiredString("Product ID is required").regex(/^[0-9a-fA-F]{24}$/, "Invalid product id");
const variantSkuSchema = z.string().trim().min(1).nullish().transform((value) => value ?? null);

export const addItemSchema = z.object({
  productId: productIdSchema,
  variantSku: variantSkuSchema,
  quantity: requiredNumber("Quantity is required").int("Quantity must be a whole number").min(1, "Quantity must be at least 1").max(10, "Quantity can be at most 10").default(1),
});

export const updateItemSchema = z.object({
  quantity: requiredNumber("Quantity is required").int("Quantity must be a whole number").min(0, "Quantity must be at least 0").max(10, "Quantity can be at most 10"),
});

export const guestItemsSchema = z.object({
  items: z
    .array(
      z.object({
        productId: productIdSchema,
        variantSku: variantSkuSchema,
        quantity: requiredNumber("Quantity is required").int("Quantity must be a whole number").min(1, "Quantity must be at least 1").max(10, "Quantity can be at most 10"),
      })
    )
    .max(50),
});
