import { STORE } from "../config/store";
import { CURRENCY, siteUrl } from "./config";
import { absoluteUrl, truncate } from "./text";

const IN_STOCK = "https://schema.org/InStock";
const OUT_OF_STOCK = "https://schema.org/OutOfStock";
const NEW = "https://schema.org/NewCondition";

const compact = (value) => {
  if (Array.isArray(value)) {
    const list = value.map(compact).filter((item) => item !== undefined);
    return list.length ? list : undefined;
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      const compacted = compact(item);
      if (compacted !== undefined) out[key] = compacted;
    }
    return Object.keys(out).length ? out : undefined;
  }
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number" && !Number.isFinite(value)) return undefined;
  return value;
};

const toPrice = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number.toFixed(2) : null;
};

export const organizationSchema = () =>
  compact({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: STORE.name,
    url: siteUrl(),
    description: STORE.description,
    logo: STORE.logo ? absoluteUrl(STORE.logo) : undefined,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: STORE.phone,
      email: STORE.email,
      areaServed: "LK",
    },
    sameAs: (STORE.social || []).map((item) => item.url),
  });

export const websiteSchema = () =>
  compact({ "@context": "https://schema.org", "@type": "WebSite", name: STORE.name, url: siteUrl() });

export const breadcrumbSchema = (items = []) =>
  compact({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items
      .filter((item) => item?.name)
      .map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: absoluteUrl(item.path),
      })),
  });

const buildOffers = (product, url) => {
  const offer = ({ sku, price, inStock }) => ({
    "@type": "Offer",
    url,
    sku,
    price: toPrice(price),
    priceCurrency: CURRENCY,
    availability: inStock ? IN_STOCK : OUT_OF_STOCK,
    itemCondition: NEW,
  });

  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length === 0) {
    return toPrice(product.price)
      ? offer({ price: product.price, inStock: Number(product.stock) > 0 })
      : undefined;
  }

  const offers = variants
    .map((variant) =>
      offer({
        sku: variant.sku,
        price: variant.price ?? product.price,
        inStock: Number(variant.stock) > 0,
      })
    )
    .filter((item) => item.price);
  if (offers.length === 0) return undefined;

  const prices = offers.map((item) => Number(item.price));
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  if (low === high) {
    return offer({ price: low, inStock: offers.some((item) => item.availability === IN_STOCK) });
  }
  return {
    "@type": "AggregateOffer",
    lowPrice: low.toFixed(2),
    highPrice: high.toFixed(2),
    priceCurrency: CURRENCY,
    offerCount: offers.length,
    offers,
  };
};

export const productSchema = (product, { path } = {}) => {
  if (!product?.name) return null;
  const url = absoluteUrl(path || (product.slug ? `/products/${encodeURIComponent(product.slug)}` : "/products"));
  const images = (product.images || [])
    .map((image) => absoluteUrl(typeof image === "string" ? image : image?.url))
    .filter(Boolean)
    .slice(0, 5);
  const ratingCount = Number(product.ratingCount ?? 0);
  const ratingAverage = Number(product.ratingAverage ?? product.ratingAvg ?? 0);
  const hasRating = ratingCount > 0 && ratingAverage > 0;

  return compact({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: truncate(product.description, 5000),
    image: images,
    sku: product.sku || (product.id || product._id ? String(product.id || product._id) : undefined),
    brand:
      typeof product.brand === "string"
        ? { "@type": "Brand", name: product.brand }
        : product.brand?.name
          ? { "@type": "Brand", name: product.brand.name }
          : undefined,
    url,
    offers: buildOffers(product, url),
    aggregateRating: hasRating
      ? {
          "@type": "AggregateRating",
          ratingValue: ratingAverage,
          reviewCount: ratingCount,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
  });
};
