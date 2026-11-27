import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";
import { ProductCardSkeleton, Skeleton } from "./common/Skeleton";

const gridClass = "mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4";

export default function ProductSection({ title, products, viewAllTo }) {
  if (!products || products.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-medium">{title}</h2>
        <Link to={viewAllTo} className="text-sm text-blue-600 hover:underline">
          View all
        </Link>
      </div>
      <div className={gridClass}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export function ProductSectionSkeleton({ title, count = 4 }) {
  return (
    <section className="mt-10" aria-hidden="true">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{title}</h2>
        <Skeleton className="h-4 w-16" />
      </div>
      <div className={gridClass}>
        {Array.from({ length: count }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}
