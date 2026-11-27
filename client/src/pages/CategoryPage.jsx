import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getCategory } from "../api/catalog";
import { getErrorMessage } from "../api/axios";
import ProductListing from "../components/ProductListing";
import Alert from "../components/Alert";
import NotFound from "./NotFound";
import { PageSkeleton } from "../components/common/Skeleton";
import Seo from "../components/seo/Seo";
import { listingSeo } from "../seo/listing";

export default function CategoryPage() {
  const { slug } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["catalog", "category", slug],
    queryFn: () => getCategory(slug),
    retry: false,
  });

  if (isLoading) return <PageSkeleton />;
  if (isError) {
    if (error?.response?.status === 404) {
      return (
        <>
          <Seo noindex title="Category not found" />
          <NotFound />
        </>
      );
    }
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Alert>{getErrorMessage(error)}</Alert>
      </main>
    );
  }

  const { category, parent, children } = data;
  const seo = listingSeo({ category });

  return (
    <>
      <Seo
        title={seo.title}
        description={seo.description}
        path={`/products?category=${encodeURIComponent(category.slug)}`}
      />
      <main className="mx-auto max-w-6xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-gray-500">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link to="/" className="hover:underline">
              Home
            </Link>
          </li>
          {parent && (
            <>
              <li aria-hidden="true">›</li>
              <li>
                <Link to={`/category/${parent.slug}`} className="hover:underline">
                  {parent.name}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="text-gray-900">
            {category.name}
          </li>
        </ol>
      </nav>

      <h1 className="text-2xl font-semibold">{category.name}</h1>

      {children.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {children.map((child) => (
            <Link
              key={child._id}
              to={`/category/${child.slug}`}
              className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6">
        <ProductListing key={slug} categorySlug={slug} />
      </div>
      </main>
    </>
  );
}
