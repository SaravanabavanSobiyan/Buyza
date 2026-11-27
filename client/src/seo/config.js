export const DEFAULT_OG_IMAGE = "/og-default.jpg";
export const CURRENCY = "LKR";

export const siteUrl = () => {
  const raw = (import.meta.env.VITE_SITE_URL || "").trim().replace(/\/+$/, "");
  if (raw) return raw;
  return typeof window !== "undefined" ? window.location.origin : "";
};

export const indexingAllowed = () => import.meta.env.VITE_ALLOW_INDEXING === "true";
