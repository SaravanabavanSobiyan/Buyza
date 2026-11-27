import { z } from "zod";

const requiredString = (message) => z.string({ message });

const objectId = requiredString("Invalid id").regex(/^[a-f\d]{24}$/i, "Invalid id");
const name = requiredString("Name is required").trim().min(2, "Name must be at least 2 characters").max(60);

export const categorySchema = z.object({
  name,
  parent: objectId.nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export const updateCategorySchema = categorySchema.partial();

export const brandSchema = z.object({
  name,
  isActive: z.boolean().optional(),
});

export const updateBrandSchema = brandSchema.partial();
