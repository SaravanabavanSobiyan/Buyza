const FALLBACK = "/og-default.jpg";

const imageUrl = (image) => {
  if (typeof image === "string") return image;
  return image?.url || image?.src || "";
};

const cloudinaryUrl = (url, width) => {
  if (!url.includes("res.cloudinary.com/") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
};

export default function ResponsiveImage({
  src,
  alt = "",
  className = "",
  sizes = "100vw",
  width,
  height,
  loading = "lazy",
  fetchPriority,
  ...props
}) {
  const url = imageUrl(src);
  const displayUrl = url ? cloudinaryUrl(url, width || 960) : FALLBACK;
  const srcSet = url && url.includes("res.cloudinary.com/")
    ? [320, 640, 960, 1280].map((size) => `${cloudinaryUrl(url, size)} ${size}w`).join(", ")
    : undefined;

  return (
    <img
      src={displayUrl}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      fetchPriority={fetchPriority}
      onError={(event) => {
        if (event.currentTarget.getAttribute("src") === FALLBACK) return;
        event.currentTarget.onerror = null;
        event.currentTarget.removeAttribute("srcset");
        event.currentTarget.src = FALLBACK;
      }}
      className={className}
      {...props}
    />
  );
}
