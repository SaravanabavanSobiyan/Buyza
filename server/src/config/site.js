export const getSiteUrl = () => {
  const raw = (process.env.SITE_URL || "").trim().replace(/\/+$/, "");
  const production = process.env.NODE_ENV === "production";

  if (!raw) {
    if (production) throw new Error("SITE_URL must be set in production (for example https://www.yourshop.lk)");
    return "http://localhost:5173";
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`SITE_URL is not a valid URL: ${raw}`);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`SITE_URL must start with http:// or https://: ${raw}`);
  }
  if (production && url.protocol !== "https:") {
    throw new Error("SITE_URL must use https:// in production");
  }
  return url.origin;
};

export const indexingAllowed = () => process.env.ALLOW_INDEXING === "true";

export const assertSeoConfig = () => {
  const url = getSiteUrl();
  if (process.env.NODE_ENV === "production" && !indexingAllowed()) {
    console.warn("[seo] ALLOW_INDEXING is not \"true\": robots.txt tells search engines NOT to index this site");
  }
  return url;
};
