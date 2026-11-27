import { z } from "zod";

const requiredString = (message) => z.string({ message });

const objectId = requiredString("Product ID is required").regex(/^[a-f\d]{24}$/i, "Invalid id");

export const adjustStockSchema = z
  .object({
    productId: objectId,
    sku: z.string().trim().max(40).optional(),
    mode: z.enum(["add", "remove", "set"], { message: "Select a stock adjustment mode" }),
    quantity: z.number({ message: "Quantity is required" }).int("Enter a whole number").min(0).max(1_000_000),
    reason: z.enum(["restock", "return", "damage", "correction", "other"], { message: "Select a stock reason" }),
    note: z.string().trim().max(200).default(""),
  })
  .superRefine((data, ctx) => {
    if (data.mode !== "set" && data.quantity < 1) {
      ctx.addIssue({ code: "custom", path: ["quantity"], message: "Enter at least 1" });
    }
  });

export const inventoryQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  status: z.enum(["all", "ok", "low", "out"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(15),
});

export const historyQuerySchema = z.object({
  productId: objectId.optional(),
  sku: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
