const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const RESPONSE_HEADERS = [
  "cache-control",
  "content-disposition",
  "content-language",
  "content-type",
  "etag",
  "last-modified",
  "location",
  "vary",
];

const getApiOrigin = (value) => {
  if (!value) return null;

  try {
    const url = new URL(value);
    const isLocalHttp =
      url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);

    if (
      (url.protocol !== "https:" && !isLocalHttp) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
};

export default async function handler(req, res) {
  const apiOrigin = getApiOrigin(globalThis.process?.env?.BUYZA_API_ORIGIN);
  if (!apiOrigin) {
    res.status(503).json({ message: "The API proxy is not configured." });
    return;
  }

  const upstreamUrl = new URL(req.url, apiOrigin);
  if (
    upstreamUrl.origin !== apiOrigin ||
    (upstreamUrl.pathname !== "/api" && !upstreamUrl.pathname.startsWith("/api/"))
  ) {
    res.status(400).json({ message: "Invalid API proxy path." });
    return;
  }

  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    const normalizedName = name.toLowerCase();
    if (
      value !== undefined &&
      normalizedName !== "host" &&
      normalizedName !== "content-length" &&
      !HOP_BY_HOP_HEADERS.has(normalizedName)
    ) {
      headers.set(normalizedName, Array.isArray(value) ? value.join(", ") : value);
    }
  }

  const request = {
    method: req.method,
    headers,
    redirect: "manual",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    request.body = req;
    request.duplex = "half";
  }

  try {
    const upstream = await fetch(upstreamUrl, request);
    res.status(upstream.status);

    for (const name of RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }

    const cookies =
      typeof upstream.headers.getSetCookie === "function"
        ? upstream.headers.getSetCookie()
        : upstream.headers.get("set-cookie");
    if (cookies?.length) res.setHeader("set-cookie", cookies);

    if (req.method === "HEAD" || upstream.status === 204 || upstream.status === 304) {
      res.end();
      return;
    }

    const body = await upstream.arrayBuffer();
    res.setHeader("content-length", body.byteLength);
    res.end(globalThis.Buffer.from(body));
  } catch (error) {
    console.error("[api-proxy] upstream request failed:", error?.name || "Error");
    res.status(502).json({ message: "The API service is temporarily unavailable." });
  }
}
