import { STORE } from "../config/store";
import { truncate } from "./text";

export const listingSeo = ({ category, q, page } = {}) => {
  const pageNumber = Number(page);
  const pageNum = Number.isInteger(pageNumber) && pageNumber > 1 ? Math.min(pageNumber, 1000) : 1;
  const search = typeof q === "string" ? q.trim() : "";
  if (search) {
    return {
      title: `Search results for "${truncate(search, 40)}"`,
      description: `Products matching your search at ${STORE.name}.`,
      path: "/products",
      noindex: true,
      follow: true,
    };
  }

  const name = typeof category?.name === "string" ? category.name.trim() : "";
  const base = category?.slug ? `/products?category=${encodeURIComponent(category.slug)}` : "/products";
  const path = pageNum > 1 ? `${base}${base.includes("?") ? "&" : "?"}page=${pageNum}` : base;
  const description = category?.description
    ? truncate(category.description)
    : name
      ? `Shop ${name} at ${STORE.name}. Prices in rupees, with cash on delivery across Sri Lanka.`
      : `Browse everything we sell at ${STORE.name}. Prices in rupees, with cash on delivery across Sri Lanka.`;

  return {
    title: `${name || "All products"}${pageNum > 1 ? ` - Page ${pageNum}` : ""}`,
    description,
    path,
    noindex: false,
    follow: false,
  };
};
