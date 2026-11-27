import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProduct } from "../api/catalog";
import { getErrorMessage } from "../api/axios";
import { formatMoney } from "../utils/money";
import { findVariant, getOptions, normalizeVariants, priceSummary, stockStatus } from "../utils/variants";
import ImageGallery from "../components/ImageGallery";
import VariantSelector from "../components/VariantSelector";
import QuantityStepper from "../components/QuantityStepper";
import AddToCartButton from "../components/cart/AddToCartButton";
import BuyNowButton from "../components/cart/BuyNowButton";
import WishlistButton from "../components/wishlist/WishlistButton";
import Alert from "../components/Alert";
import ProductReviews from "../components/reviews/ProductReviews";
import StarRating from "../components/reviews/StarRating";
import NotFound from "../components/common/NotFound";
import { PageSkeleton } from "../components/common/Skeleton";
import StickyProductActions from "../components/StickyProductActions";
import Seo from "../components/seo/Seo";
import { breadcrumbSchema, productSchema } from "../seo/schema";

const STOCK_BADGE = {
  in: "bg-green-50 text-green-700",
  low: "bg-amber-50 text-amber-800",
  out: "bg-red-50 text-red-700",
};

function ProductView({ product, onReviewsChanged }) {
  const variantRef = useRef(null);
  const actionsRef = useRef(null);
  const cartItems = useSelector((state) => state.cart.cart.items);
  const cartStatus = useSelector((state) => state.cart.status);
  const cartLoaded = useSelector((state) => state.cart.loaded);

  const variants = useMemo(() => normalizeVariants(product.variants), [product.variants]);
  const options = useMemo(() => getOptions(variants), [variants]);
  const hasVariants = variants.length > 0;
  const [selected, setSelected] = useState(() => (variants.length === 1 ? { ...variants[0].attributes } : {}));
  const [qty, setQty] = useState(1);


  const variant = hasVariants ? findVariant(variants, options, selected) : null;
  const needsChoice = hasVariants && !variant;
  const missing = options.filter((option) => !selected[option.name]).map((option) => option.name.toLowerCase());
  const stock = variant ? variant.stock : product.stock;
  const status = stockStatus(stock, product.lowStockThreshold);
  const { amount, from } = priceSummary(variants, product.price, variant);
  const sku = variant?.sku || product.sku;

  const variantSku = variant?.sku ?? null;
  const inCart =
    cartItems.find(
      (item) => item.product?._id === product.id && (item.variantSku || null) === variantSku
    )?.quantity || 0;
  const maxBuyable = Math.max(0, Math.min(stock, 10));
  const maxAddable = Math.max(0, Math.min(stock - inCart, 10 - inCart));
  const safeQty = Math.min(Math.max(1, qty), Math.max(1, maxBuyable));
  const canAddQuantity = maxAddable > 0 && safeQty <= maxAddable;

  const selectValue = (name, value) =>
    setSelected((current) => {
      if (current[name] === value) {
        const next = { ...current };
        delete next[name];
        return next;
      }
      return { ...current, [name]: value };
    });

  const buttonLabel =
    status === "out"
      ? "Out of stock"
      : !needsChoice && maxAddable === 0
        ? "Maximum in cart"
        : "Add to cart";

  return (
    <>
      <Seo
        title={product.seo?.title || product.name}
        description={product.seo?.description || product.description}
        image={product.images?.[0]?.url || product.images?.[0]}
        imageAlt={product.name}
        path={`/products/${encodeURIComponent(product.slug)}`}
        type="product"
        meta={[
          { property: "product:price:amount", content: String(product.price) },
          { property: "product:price:currency", content: "LKR" },
        ]}
        jsonLd={[
          productSchema(product, { path: `/products/${encodeURIComponent(product.slug)}` }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Products", path: "/products" },
            ...(product.category?.slug
              ? [{ name: product.category.name, path: `/products?category=${encodeURIComponent(product.category.slug)}` }]
              : []),
            { name: product.name, path: `/products/${encodeURIComponent(product.slug)}` },
          ]),
        ]}
      />
      <main className="mx-auto max-w-6xl px-4 py-8 pb-32 md:pb-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-gray-500">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link to="/" className="hover:underline">
              Home
            </Link>
          </li>
          {product.parent && (
            <>
              <li aria-hidden="true">›</li>
              <li>
                <Link to={`/category/${product.parent.slug}`} className="hover:underline">
                  {product.parent.name}
                </Link>
              </li>
            </>
          )}
          {product.category && (
            <>
              <li aria-hidden="true">›</li>
              <li>
                <Link to={`/category/${product.category.slug}`} className="hover:underline">
                  {product.category.name}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="text-gray-900">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid min-w-0 gap-6 md:grid-cols-2 md:gap-8">
        <ImageGallery images={product.images} alt={product.name} />

        <div className="min-w-0">
          {product.brand && (
            <Link to={`/products?brand=${product.brand.slug}`} className="text-sm text-gray-500 hover:underline">
              {product.brand.name}
            </Link>
          )}
          <div className="mt-1 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{product.name}</h1>
              <a href="#reviews" className="mt-1 inline-flex rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                <StarRating value={product.ratingAvg} count={product.ratingCount} size={16} />
              </a>
            </div>
            <WishlistButton productId={String(product.id)} />
          </div>
          <p className="mt-3 text-2xl font-semibold">
            {from && <span className="mr-1 text-sm font-normal text-gray-500">From</span>}
            {formatMoney(amount)}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <span className={`rounded px-2 py-0.5 text-xs ${STOCK_BADGE[status]}`}>
              {status === "out" ? "Out of stock" : status === "low" ? `Only ${stock} left` : "In stock"}
            </span>
            {sku && <span className="text-gray-500">SKU {sku}</span>}
          </div>

          {hasVariants && (
            <div ref={variantRef} tabIndex={-1} className="mt-6 scroll-mt-24 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
              <VariantSelector
                options={options}
                variants={variants}
                selected={selected}
                onSelect={selectValue}
                onClear={() => setSelected({})}
              />
            </div>
          )}

          <div ref={actionsRef} className="mt-6 space-y-3">
            {needsChoice && <p className="text-sm text-gray-600">Select {missing.join(" and ")} to continue.</p>}
            {inCart > 0 && <p className="text-sm text-gray-500">You already have {inCart} in your cart.</p>}
            <div className="flex flex-wrap items-center gap-3">
              <QuantityStepper
                value={safeQty}
                max={maxBuyable}
                onChange={setQty}
                disabled={needsChoice || maxBuyable <= 0 || cartStatus === "loading" || !cartLoaded}
              />
              <AddToCartButton
                productId={product.id}
                variantSku={variantSku}
                quantity={safeQty}
                disabled={needsChoice || !canAddQuantity || cartStatus === "loading" || !cartLoaded}
                className="min-h-11 px-6"
              >
                {buttonLabel}
              </AddToCartButton>
              <BuyNowButton
                productId={product.id}
                variantSku={variantSku}
                quantity={safeQty}
                disabled={needsChoice || maxBuyable <= 0 || cartStatus === "loading" || !cartLoaded}
                className="min-h-11 px-6"
                product={{
                  name: product.name,
                  slug: product.slug,
                  image: product.images?.[0]?.url || product.images?.[0] || null,
                }}
                unitPrice={variant?.price ?? product.price}
              />
            </div>
          </div>

          {product.description && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h2 className="mb-2 text-sm font-medium">Description</h2>
              <p className="whitespace-pre-line text-sm text-gray-700">{product.description}</p>
            </div>
          )}

        </div>
      </div>

      <ProductReviews productId={String(product.id)} onChanged={onReviewsChanged} />
      <StickyProductActions
        targetRef={actionsRef}
        price={amount}
        priceFrom={from}
        needsChoice={needsChoice}
        onChooseOption={() => {
          variantRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          variantRef.current?.focus({ preventScroll: true });
        }}
      >
        <>
          <AddToCartButton
            productId={product.id}
            variantSku={variantSku}
            quantity={safeQty}
            disabled={!canAddQuantity || cartStatus === "loading" || !cartLoaded}
            className="min-h-11 flex-1 px-2 text-xs sm:text-sm"
          >
            {buttonLabel}
          </AddToCartButton>
          <BuyNowButton
            productId={product.id}
            variantSku={variantSku}
            quantity={safeQty}
            disabled={status === "out" || maxBuyable <= 0 || cartStatus === "loading" || !cartLoaded}
            className="min-h-11 flex-1 px-2 text-xs sm:text-sm"
            product={{
              name: product.name,
              slug: product.slug,
              image: product.images?.[0]?.url || product.images?.[0] || null,
            }}
            unitPrice={variant?.price ?? product.price}
          />
        </>
      </StickyProductActions>
      </main>
    </>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["catalog", "product", slug],
    queryFn: () => getProduct(slug),
    retry: false,
  });

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (isError) {
    if (error?.response?.status === 404) {
      return (
        <>
          <Seo noindex title="Product not found" />
          <NotFound
            title="Product not found"
            message="This product doesn't exist or is no longer available."
          />
        </>
      );
    }
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Alert>{getErrorMessage(error)}</Alert>
      </main>
    );
  }

  return (
    <ProductView
      key={data.id}
      product={data}
      onReviewsChanged={() => queryClient.invalidateQueries({ queryKey: ["catalog", "product", slug] })}
    />
  );
}
