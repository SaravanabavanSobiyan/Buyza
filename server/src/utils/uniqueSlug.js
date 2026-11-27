import { slugify } from "./slugify.js";

// "red-shirt", then "red-shirt-2", "red-shirt-3"...
export async function uniqueSlug(Model, text, excludeId) {
  const base = slugify(text) || "item";
  let slug = base;
  let i = 2;
  while (await Model.exists({ slug, ...(excludeId && { _id: { $ne: excludeId } }) })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}
