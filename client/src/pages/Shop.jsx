import { useSearchParams } from "react-router-dom";
import ProductListing from "../components/ProductListing";
import Seo from "../components/seo/Seo";
import { listingSeo } from "../seo/listing";
import { useQuery } from "@tanstack/react-query";
import { getCategory } from "../api/catalog";

export default function Shop() {
  const [params] = useSearchParams();
  const search = (params.get("search") || "").trim();
  const categorySlug = params.get("category") || "";
  const { data: categoryData } = useQuery({
    queryKey: ["catalog", "seo-category", categorySlug],
    queryFn: () => getCategory(categorySlug),
    enabled: Boolean(categorySlug),
    retry: false,
  });
  const activeCategory = categoryData?.category
    ? { ...categoryData.category, description: categoryData.category.description }
    : categorySlug
      ? { slug: categorySlug }
      : null;
  const seo = listingSeo({
    category: activeCategory,
    q: search,
    page: params.get("page"),
  });

  const heading = search
    ? `Results for “${search}”`
    : params.get("featured") === "true"
      ? "Featured products"
      : params.get("sort") === "bestselling"
        ? "Best sellers"
        : "All products";

  return (
    <>
      <Seo
        title={seo.title}
        description={seo.description}
        path={seo.path}
        noindex={seo.noindex}
        follow={seo.follow}
      />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold">{heading}</h1>
        <ProductListing />
      </main>
    </>
  );
}
