export const STATIC_PATHS = ["/", "/products", "/about", "/faq", "/shipping", "/returns", "/terms", "/privacy", "/contact"];

export const productPath = (slug) => `/products/${encodeURIComponent(slug)}`;
export const categoryPath = (slug) => `/products?category=${encodeURIComponent(slug)}`;
