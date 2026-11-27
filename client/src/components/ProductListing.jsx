import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getBrands, getProducts } from "../api/catalog";
import { getErrorMessage } from "../api/axios";
import { applyChanges, readCatalogParams, toApiParams } from "../utils/catalogParams";
import ProductCard from "./ProductCard";
import Pagination from "./Pagination";
import SearchBox from "./SearchBox";
import CatalogFilters from "./CatalogFilters";
import ResponsiveFilters from "./ResponsiveFilters";
import Alert from "./Alert";
import { inputClass } from "./FormField";
import { ProductGridSkeleton } from "./common/Skeleton";

const SORTS = [
  ["relevance", "Relevance"],
  ["newest", "Newest"],
  ["bestselling", "Best selling"],
  ["price_asc", "Price: low to high"],
  ["price_desc", "Price: high to low"],
  ["name_asc", "Name: A to Z"],
];
const PAGE_SIZE = 12;
const gridClass = "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4";

export default function ProductListing({ categorySlug }) {
  const [params, setParams] = useSearchParams();
  const filters = readCatalogParams(params);

  const { data: brands = [] } = useQuery({
    queryKey: ["catalog", "brands"],
    queryFn: getBrands,
    staleTime: 5 * 60 * 1000,
  });

  const apiParams = toApiParams(filters, categorySlug, PAGE_SIZE);
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["catalog", "products", apiParams],
    queryFn: () => getProducts(apiParams),
    placeholderData: keepPreviousData,
  });

  const setParam = (changes) => setParams(applyChanges(params, changes));

  const changePage = (value) => {
    setParam({ page: value });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasFilters = filters.brands.length > 0 || Boolean(filters.minPrice) || Boolean(filters.maxPrice) || filters.inStock || filters.featured;
  const activeFilterCount = filters.brands.length + (filters.minPrice || filters.maxPrice ? 1 : 0) + (filters.inStock ? 1 : 0) + (filters.featured ? 1 : 0);
  const clearFilters = () => setParam({ brand: null, minPrice: null, maxPrice: null, inStock: null, featured: null, page: null });
  const clearEverything = () => setParam({ search: null, brand: null, minPrice: null, maxPrice: null, inStock: null, featured: null, sort: null, page: null });

  const sortOptions = SORTS.filter(([value]) => value !== "relevance" || filters.search);
  const products = data?.products || [];
  const pagination = data?.pagination;
  const filtered = Boolean(filters.search) || hasFilters;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox value={filters.search} onSearch={(value) => setParam({ search: value, page: null })} className="min-w-[200px] flex-1" />
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="sort" className="text-gray-600">
            Sort by
          </label>
          <select
            id="sort"
            value={filters.sort}
            onChange={(event) => setParam({ sort: event.target.value === filters.defaultSort ? null : event.target.value, page: null })}
            className={`${inputClass()} w-auto`}
          >
            {sortOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <ResponsiveFilters activeFilterCount={activeFilterCount} resultCount={pagination?.total}>
          {({ mobile }) => (
            <CatalogFilters
              key={`${filters.minPrice}:${filters.maxPrice}`}
              filters={filters}
              brands={brands}
              hasFilters={hasFilters}
              hideTitle={mobile}
              onChange={(changes) => setParam({ ...changes, page: null })}
              onClear={clearFilters}
            />
          )}
        </ResponsiveFilters>

        <div>
          <p className="mb-4 text-sm text-gray-600">
            {pagination ? `${pagination.total} product${pagination.total === 1 ? "" : "s"}` : "\u00a0"}
          </p>

          {isError && <Alert>{getErrorMessage(error)}</Alert>}

          {isLoading && <ProductGridSkeleton count={8} className={gridClass} />}

          {!isLoading && !isError && products.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
              {filtered ? (
                <>
                  <p className="font-medium">No products match your search</p>
                  <p className="mt-1 text-sm text-gray-500">Try different words, or remove some filters.</p>
                  <button type="button" onClick={clearEverything} className="mt-3 text-sm text-blue-600 hover:underline">
                    Clear search and filters
                  </button>
                </>
              ) : (
                <>
                  <p className="font-medium">No products here yet</p>
                  <p className="mt-1 text-sm text-gray-500">Check back soon, or try another category.</p>
                  {filters.page > 1 && (
                    <button type="button" onClick={() => changePage(1)} className="mt-3 text-sm text-blue-600 hover:underline">
                      Back to the first page
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {products.length > 0 && (
            <div className={`${gridClass} ${isFetching ? "opacity-60" : ""}`}>
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < 2} />
              ))}
            </div>
          )}

          {pagination && <Pagination page={pagination.page} pages={pagination.pages} onChange={changePage} />}
        </div>
      </div>
    </section>
  );
}
