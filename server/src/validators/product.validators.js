import { z } from "zod";

const requiredString = (message) => z.string({ message });

const requiredNumber = (message) => z.number({ message });

const objectId = requiredString("Product ID is required").regex(/^[a-f\d]{24}$/i, "Invalid id");
const minor = requiredNumber("Price is required").int("Price must be a whole number of cents").min(0); // minor units

const image = z.object({
  url: requiredString("Image URL is required").trim().url("Enter a valid image URL"),
  publicId: requiredString("Image public ID is required").min(1, "Image public ID is required"),
});

const optionKey = requiredString("Option name is required").trim().regex(/^[A-Za-z0-9 _-]{1,30}$/, "Option names can use letters, numbers, spaces, - and _");
const optionValue = requiredString("Option value is required").trim().min(1).max(40);

const variant = z.object({
  sku: requiredString("Variant SKU is required").trim().min(1, "Every variant needs a SKU").max(40),
  attributes: z.record(optionKey, optionValue).default({}),
  price: minor.nullable().optional(),
  stock: requiredNumber("Stock is required").int().min(0, "Stock can't be negative").default(0),
});

const variants = z
  .array(variant)
  .max(50, "Up to 50 variants")
  .superRefine((list, ctx) => {
    const skus = list.map((v) => v.sku.toLowerCase());
    if (new Set(skus).size !== skus.length) {
      ctx.addIssue({ code: "custom", message: "Variant SKUs must be unique" });
    }
  });

const fields = {
  name: requiredString("Name is required").trim().min(2, "Name must be at least 2 characters").max(120),
  slug: z.string().trim().max(150).optional(),
  description: z.string().trim().max(5000).default(""),
  price: minor,
  salePrice: minor.nullable().optional(),
  category: objectId,
  brand: objectId.nullable().optional(),
  sku: z.string().trim().max(40).optional(),
  images: z.array(image).max(8, "Up to 8 images").default([]),
  tags: z.array(requiredString("Tag is required").trim().min(1).max(30)).max(20).default([]),
  stock: requiredNumber("Stock is required").int().min(0, "Stock can't be negative").default(0),
  lowStockThreshold: requiredNumber("Low stock threshold is required").int().min(0).default(5),
  variants: variants.default([]),
  seo: z
    .object({
      title: z.string().trim().max(70).default(""),
      description: z.string().trim().max(160).default(""),
    })
    .optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
};

const validateSalePrice = (product, ctx) => {
  if (product.salePrice != null && product.price != null && product.salePrice >= product.price) {
    ctx.addIssue({ code: "custom", path: ["salePrice"], message: "Sale price must be less than the regular price" });
  }
};

export const createProductSchema = z.object(fields).superRefine(validateSalePrice);
export const updateProductSchema = z.object(fields).partial().superRefine(validateSalePrice);

export const productQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  category: objectId.optional(),
  brand: objectId.optional(),
  status: z.enum(["all", "active", "draft"]).default("all"),
  stock: z.enum(["all", "low", "out"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
