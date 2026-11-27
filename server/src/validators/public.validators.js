import { z } from "zod";

const slug = z.string().trim().regex(/^[a-z0-9-]+$/, "Invalid category").max(100);
const brandSlugs = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]+(,[a-z0-9-]+)*$/, "Invalid brand")
  .max(300);
const minorUnits = z.coerce.number().int().min(0).max(1_000_000_000_000);

export const publicProductQuerySchema = z
  .object({
    search: z.string().trim().max(80).optional(),
    category: slug.optional(),
    brand: brandSlugs.optional(),
    minPrice: minorUnits.optional(),
    maxPrice: minorUnits.optional(),
    inStock: z.enum(["true"]).optional(),
    deals: z.enum(["true", "false"]).optional(),
    featured: z.enum(["true"]).optional(),
    sort: z.enum(["relevance", "newest", "bestselling", "price_asc", "price_desc", "name_asc"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(48).default(12),
  })
  .refine((data) => data.minPrice === undefined || data.maxPrice === undefined || data.minPrice <= data.maxPrice, {
    path: ["minPrice"],
    message: "Minimum price can't be higher than the maximum",
  });
