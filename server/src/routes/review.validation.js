import { z } from "zod";

export const reviewSchema = z.object({
  rating: z.coerce.number().int("Rating must be a whole number").min(1).max(5),
  title: z.string().trim().max(100).optional().default(""),
  body: z.string().trim().min(10, "Review must be at least 10 characters").max(2000),
  keepPhotoIds: z.string().optional(),
});
