import { asyncHandler } from "../utils/asyncHandler.js";
import { getSitemapXml } from "../services/sitemap.service.js";
import { buildRobotsTxt } from "../services/robots.service.js";

export const sitemap = asyncHandler(async (req, res) => {
  const xml = await getSitemapXml();
  res.set("Cache-Control", "public, max-age=3600").type("application/xml").send(xml);
});

export const robots = (req, res) => {
  res.set("Cache-Control", "public, max-age=3600").type("text/plain").send(buildRobotsTxt());
};
