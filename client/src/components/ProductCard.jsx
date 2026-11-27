import { Link } from "react-router-dom";
import { formatMoney } from "../utils/money";
import StarRating from "./reviews/StarRating";
import WishlistButton from "./wishlist/WishlistButton";
import ResponsiveImage from "./common/ResponsiveImage";

export default function ProductCard({ product, priority = false }) {
  const out = product.stockStatus === "out";
  const onSale = product.salePrice != null && product.salePrice < product.price;

  return (
    <article className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-md">
      <div className="relative aspect-square bg-gray-100">
        <Link to={`/products/${product.slug}`} className="block h-full w-full">
          {product.image ? (
            <ResponsiveImage
              src={product.image}
              alt={product.name}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              width={640}
              height={640}
              className={`h-full w-full object-cover ${out ? "opacity-60" : ""}`}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-gray-400">No image</div>
          )}
          {out && <span className="absolute left-2 top-2 rounded bg-gray-900 px-2 py-0.5 text-xs text-white">Out of stock</span>}
          {product.stockStatus === "low" && (
            <span className="absolute left-2 top-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Few left</span>
          )}
        </Link>
        <WishlistButton productId={String(product.id)} className="absolute right-2 top-2 z-10" />
      </div>
      <Link to={`/products/${product.slug}`} className="block p-3">
        {product.category && <p className="text-xs text-gray-500">{product.category.name}</p>}
        <h3 className="mt-0.5 line-clamp-2 text-sm font-medium group-hover:underline">{product.name}</h3>
        {product.ratingCount > 0 && (
          <StarRating value={product.ratingAvg} count={product.ratingCount} size={14} className="mt-1" />
        )}
        <p className="mt-1 flex flex-wrap items-baseline gap-2 text-sm font-semibold">
          <span className={onSale ? "text-red-600" : ""}>{formatMoney(onSale ? product.salePrice : product.price)}</span>
          {onSale && <span className="text-xs font-normal text-gray-500 line-through">{formatMoney(product.price)}</span>}
        </p>
      </Link>
    </article>
  );
}
