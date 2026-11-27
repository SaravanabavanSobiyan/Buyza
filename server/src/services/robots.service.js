import { getSiteUrl, indexingAllowed } from "../config/site.js";

export const buildRobotsTxt = () => {
  if (!indexingAllowed()) return "User-agent: *\nDisallow: /\n";

  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /api",
    "",
    `Sitemap: ${getSiteUrl()}/sitemap.xml`,
    "",
  ].join("\n");
};
