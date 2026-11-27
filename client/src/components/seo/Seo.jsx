import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { STORE } from "../../config/store";
import { DEFAULT_OG_IMAGE, indexingAllowed } from "../../seo/config";
import { robotsContent } from "../../seo/robots";
import { absoluteUrl, jsonLdString, normalizePath, truncate } from "../../seo/text";

export default function Seo({
  title,
  description,
  image,
  imageAlt,
  path,
  type = "website",
  noindex = false,
  follow = false,
  titleTemplate = true,
  meta = [],
  jsonLd,
}) {
  const location = useLocation();
  const indexable = indexingAllowed() && !noindex;
  const socialTitle = title || STORE.name;
  const fullTitle = title && titleTemplate ? `${title} | ${STORE.name}` : socialTitle;
  const desc = truncate(description || STORE.description, 155);
  const url = absoluteUrl(normalizePath(path ?? location.pathname));
  const img = absoluteUrl(image || DEFAULT_OG_IMAGE);
  const alt = image ? imageAlt || socialTitle : STORE.name;
  const schemas = [].concat(jsonLd ?? []).filter(Boolean);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta name="robots" content={robotsContent({ noindex: !indexable, follow })} />
      {indexable && <link rel="canonical" href={url} />}
      <meta property="og:site_name" content={STORE.name} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={socialTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      {img && <meta property="og:image" content={img} />}
      {img && <meta property="og:image:alt" content={alt} />}
      <meta name="twitter:card" content={img ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={socialTitle} />
      <meta name="twitter:description" content={desc} />
      {img && <meta name="twitter:image" content={img} />}
      {img && <meta name="twitter:image:alt" content={alt} />}
      {meta.map((item) => (
        <meta key={item.property || item.name} {...(item.property ? { property: item.property } : { name: item.name })} content={item.content} />
      ))}
      {indexable &&
        schemas.map((schema, index) => (
          <script key={index} type="application/ld+json">
            {jsonLdString(schema)}
          </script>
        ))}
    </Helmet>
  );
}
