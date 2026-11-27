import Product from "../models/Product.js";
import Category from "../models/Category.js";
import { getSiteUrl } from "../config/site.js";
import { escapeXml } from "../utils/xml.js";
import { STATIC_PATHS, productPath, categoryPath } from "../utils/siteUrls.js";

const TTL_MS = 60 * 60 * 1000;
export const MAX_URLS = 50_000;

let cache = null;

export const clearSitemapCache = () => {
  cache = null;
};

const validSlug = (slug) => typeof slug === "string" && slug.trim().length > 0;

const lastmod = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
};

export const buildSitemapXml = (entries) => {
  const items = entries
    .map(({ loc, lastmod: mod }) =>
      `  <url>\n    <loc>${escapeXml(loc)}</loc>${mod ? `\n    <lastmod>${mod}</lastmod>` : ""}\n  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
};

const build = async () => {
  const site = getSiteUrl();

  const [categories, products] = await Promise.all([
    Category.find({ isActive: { $ne: false } }).select("slug updatedAt").lean(),
    Product.find({ isActive: true, isDeleted: { $ne: true } })
      .select("slug updatedAt")
      .sort({ updatedAt: -1 })
      .limit(MAX_URLS)
      .lean(),
  ]);

  const entries = [
    ...STATIC_PATHS.map((path) => ({ loc: `${site}${path}` })),
    ...categories
      .filter((category) => validSlug(category.slug))
      .map((category) => ({ loc: `${site}${categoryPath(category.slug)}`, lastmod: lastmod(category.updatedAt) })),
    ...products
      .filter((product) => validSlug(product.slug))
      .map((product) => ({ loc: `${site}${productPath(product.slug)}`, lastmod: lastmod(product.updatedAt) })),
  ];

  if (entries.length >= MAX_URLS) {
    console.warn(`[seo] sitemap reached ${MAX_URLS} URLs and was cut off: split it into several files`);
  }
  return buildSitemapXml(entries.slice(0, MAX_URLS));
};

export const getSitemapXml = () => {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.promise;

  const promise = build();
  cache = { at: now, promise };
  promise.catch(() => {
    if (cache?.promise === promise) cache = null;
  });
  return promise;
};
