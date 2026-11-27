import { isMoney, toMinor } from "./money";

const SORT_VALUES = ["relevance", "newest", "bestselling", "price_asc", "price_desc", "name_asc"];

export function readCatalogParams(params) {
  const search = (params.get("search") || "").trim();
  const defaultSort = search ? "relevance" : "newest";

  let sort = SORT_VALUES.includes(params.get("sort")) ? params.get("sort") : defaultSort;
  if (sort === "relevance" && !search) sort = "newest";

  const minRaw = params.get("minPrice") || "";
  const maxRaw = params.get("maxPrice") || "";

  return {
    search,
    brands: (params.get("brand") || "").split(",").filter(Boolean),
    minPrice: isMoney(minRaw) ? minRaw : "",
    maxPrice: isMoney(maxRaw) ? maxRaw : "",
    inStock: params.get("inStock") === "true",
    featured: params.get("featured") === "true",
    sort,
    defaultSort,
    page: Math.max(1, Number(params.get("page")) || 1),
  };
}

export function toApiParams(filters, categorySlug, limit) {
  return {
    ...(categorySlug && { category: categorySlug }),
    ...(filters.search && { search: filters.search }),
    ...(filters.brands.length > 0 && { brand: filters.brands.join(",") }),
    ...(filters.minPrice && { minPrice: toMinor(filters.minPrice) }),
    ...(filters.maxPrice && { maxPrice: toMinor(filters.maxPrice) }),
    ...(filters.inStock && { inStock: "true" }),
    ...(filters.featured && { featured: "true" }),
    sort: filters.sort,
    page: filters.page,
    limit,
  };
}

export function applyChanges(params, changes) {
  const next = new URLSearchParams(params);
  Object.entries(changes).forEach(([key, value]) => {
    const empty =
      value == null ||
      value === "" ||
      value === false ||
      (Array.isArray(value) && value.length === 0) ||
      (key === "page" && Number(value) <= 1);

    if (empty) next.delete(key);
    else next.set(key, Array.isArray(value) ? value.join(",") : String(value));
  });
  return next;
}
