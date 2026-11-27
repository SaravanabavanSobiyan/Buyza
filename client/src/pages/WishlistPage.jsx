import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "../api/axios";
import { fetchWishlist } from "../api/wishlist";
import Pagination from "../components/Pagination";
import WishlistButton from "../components/wishlist/WishlistButton";
import { addToCart } from "../store/cartSlice";
import { fetchWishlistIds, toggleWishlist } from "../store/wishlistSlice";
import { formatDate } from "../utils/format";
import { formatMoney } from "../utils/money";
import { showErrorToast } from "../utils/showErrorToast";

const gridClass = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

function WishlistSkeleton() {
  return (
    <div className={gridClass} aria-label="Loading wishlist">
      {[1, 2, 3].map((item) => (
        <div key={item} className="flex animate-pulse gap-4 rounded-xl border border-gray-200 bg-white p-3">
          <div className="h-28 w-28 shrink-0 rounded-lg bg-gray-200" />
          <div className="flex-1 space-y-3 py-2">
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-4 w-1/3 rounded bg-gray-200" />
            <div className="h-8 w-28 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WishlistPage() {
  const [params, setParams] = useSearchParams();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const userId = useSelector((state) => state.auth.user?.id || state.auth.user?._id);
  const parsedPage = Number(params.get("page") || 1);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const [movingIds, setMovingIds] = useState(() => new Set());
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["wishlist", userId, page],
    queryFn: () => fetchWishlist({ page, limit: 12 }),
    retry: false,
  });

  const setPage = useCallback((nextPage) => {
    const next = new URLSearchParams(params);
    if (nextPage === 1) next.delete("page");
    else next.set("page", String(nextPage));
    setParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [params, setParams]);

  useEffect(() => {
    dispatch(fetchWishlistIds())
      .unwrap()
      .catch((message) =>
        showErrorToast(message, "Unable to refresh your saved items.")
      );
  }, [dispatch, data?.total]);

  useEffect(() => {
    if (data && page > data.totalPages) setPage(data.totalPages);
  }, [data, page, setPage]);

  const refreshAfterRemoval = async () => {
    if (data?.items.length === 1 && page > 1) setPage(page - 1);
    await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
  };

  const handleChanged = async (saved) => {
    if (!saved) {
      await refreshAfterRemoval();
      dispatch(fetchWishlistIds());
    }
  };

  const moveToCart = async (item) => {
    setMovingIds((current) => new Set(current).add(item.productId));
    try {
      await dispatch(addToCart({ productId: item.productId, quantity: 1 })).unwrap();
      await dispatch(toggleWishlist({ productId: item.productId, saved: true })).unwrap();
      toast.success("Moved to cart");
      await refreshAfterRemoval();
    } catch (message) {
      showErrorToast(message, "Unable to move this item to your cart.");
    } finally {
      setMovingIds((current) => {
        const next = new Set(current);
        next.delete(item.productId);
        return next;
      });
    }
  };

  const items = data?.items || [];
  const pageOutOfRange = Boolean(data && page > data.totalPages);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#46382f]">My wishlist</h1>
          <p className="mt-1 text-sm text-gray-600">Keep the items you love in one place.</p>
        </div>
        {data && <p className="text-sm text-gray-500">{data.total} saved item{data.total === 1 ? "" : "s"}</p>}
      </header>

      {isError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p>{getErrorMessage(error, "Could not load your wishlist.")}</p>
          <button type="button" onClick={() => refetch()} className="mt-2 font-medium underline">
            Try again
          </button>
        </div>
      )}

      {(isLoading || pageOutOfRange) && <WishlistSkeleton />}

      {!isLoading && !pageOutOfRange && !isError && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-14 text-center">
          <h2 className="text-lg font-medium text-[#46382f]">Nothing saved yet</h2>
          <p className="mt-2 text-sm text-gray-500">Save products with the heart button and they’ll show up here.</p>
          <Link to="/products" className="mt-5 inline-flex rounded-lg bg-[#46382f] px-4 py-2 text-sm font-medium text-white hover:bg-[#2e251f]">
            Browse products
          </Link>
        </div>
      )}

      {!isLoading && !pageOutOfRange && !isError && items.length > 0 && (
        <>
          <div className={gridClass}>
            {items.map((item) => (
              <article key={item.productId} className="flex gap-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <Link to={`/products/${item.slug}`} className="h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {item.image ? (
                    <img src={item.image} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs text-gray-400">No image</span>
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col items-start">
                  <div className="flex w-full items-start justify-between gap-2">
                    <Link to={`/products/${item.slug}`} className="line-clamp-2 font-medium text-[#46382f] hover:underline">
                      {item.name}
                    </Link>
                    <WishlistButton productId={item.productId} onChanged={handleChanged} />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[#46382f]">{formatMoney(item.price)}</p>
                  {item.compareAtPrice != null && item.compareAtPrice > item.price && (
                    <p className="text-xs text-gray-500">
                      <span className="line-through">{formatMoney(item.compareAtPrice)}</span>
                      <span className="ml-1 font-medium text-red-600">On sale</span>
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">Saved {formatDate(item.addedAt)}</p>
                  <div className="mt-auto pt-3">
                    {!item.inStock ? (
                      <button type="button" disabled className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500">
                        Out of stock
                      </button>
                    ) : item.hasVariants ? (
                      <Link to={`/products/${item.slug}`} className="inline-flex rounded-lg bg-[#46382f] px-3 py-2 text-sm font-medium text-white hover:bg-[#2e251f]">
                        Choose options
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled={movingIds.has(item.productId)}
                        onClick={() => moveToCart(item)}
                        className="rounded-lg bg-[#46382f] px-3 py-2 text-sm font-medium text-white hover:bg-[#2e251f] disabled:cursor-wait disabled:opacity-60"
                      >
                        {movingIds.has(item.productId) ? "Moving…" : "Move to cart"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <Pagination page={data.page} pages={data.totalPages} onChange={setPage} />
        </>
      )}
    </main>
  );
}
