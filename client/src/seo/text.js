import { siteUrl } from "./config";

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

export const stripHtml = (value) =>
  String(value ?? "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (match) => ENTITIES[match])
    .replace(/\s+/g, " ")
    .trim();

export const truncate = (value, max = 155) => {
  const text = stripHtml(value);
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1).replace(/[\uD800-\uDBFF]$/, "");
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s,.;:!-]+$/, "")}…`;
};

export const normalizePath = (value) => {
  const raw = String(value ?? "/").split("#")[0];
  const [pathPart, ...rest] = raw.split("?");
  let path = (pathPart.startsWith("/") ? pathPart : `/${pathPart}`).replace(/\/{2,}/g, "/");
  if (path.length > 1) path = path.replace(/\/+$/, "");
  const query = rest.join("?");
  return query ? `${path}?${query}` : path;
};

export const absoluteUrl = (value) => {
  const v = String(value ?? "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("//")) return `https:${v}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return "";
  return `${siteUrl()}${v.startsWith("/") ? "" : "/"}${v}`;
};

export const jsonLdString = (data) =>
  JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
