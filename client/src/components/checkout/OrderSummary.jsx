import { useQuery } from "@tanstack/react-query";
import { getProduct } from "../../api/catalog";
import { formatMoney } from "../../utils/money";

const imageUrl = (image) => (typeof image === "string" ? image : image?.url || null);
const IMAGE_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'%3E%3Crect width='56' height='56' fill='%23f3f4f6'/%3E%3Cpath d='M14 39l9-10 6 6 5-6 8 10H14z' fill='%239ca3af'/%3E%3Ccircle cx='21' cy='20' r='4' fill='%239ca3af'/%3E%3C/svg%3E";

export default function OrderSummary({ quote, cart, buyNowItem, loading = false }) {
  const { data: buyNowProduct } = useQuery({
    queryKey: ["catalog", "product", buyNowItem?.slug],
    queryFn: () => getProduct(buyNowItem.slug),
    enabled: Boolean(buyNowItem?.slug && !imageUrl(buyNowItem.image)),
    retry: false,
  });
  const buyNowImage =
    imageUrl(buyNowItem?.image) || imageUrl(buyNowProduct?.images?.[0]);
  const buyNowLine = buyNowItem
    ? {
        _id: `${buyNowItem.productId}__${buyNowItem.variantSku || "none"}`,
        product: {
          _id: buyNowItem.productId,
          name: buyNowItem.name,
          slug: buyNowItem.slug,
          image: buyNowImage,
        },
        variantSku: buyNowItem.variantSku,
        quantity: buyNowItem.quantity,
        unitPrice: buyNowItem.unitPrice,
        lineTotal: buyNowItem.unitPrice * buyNowItem.quantity,
      }
    : null;
  const items = quote?.items?.length
    ? quote.items.map((item) => {
        const isBuyNowLine =
          buyNowItem &&
          (item.productId === buyNowItem.productId ||
            item.product?._id === buyNowItem.productId);
        if (!isBuyNowLine) return item;

        return {
          ...item,
          product: {
            ...item.product,
            image: imageUrl(item.product?.image) || buyNowImage,
          },
        };
      })
    : buyNowLine
      ? [buyNowLine]
      : cart.items;
  const subtotal = quote?.subtotal ?? buyNowLine?.lineTotal ?? cart.subtotal;
  const discount = quote?.discount ?? cart.discount ?? 0;
  const shipping = quote?.shipping ?? 0;
  const total = quote?.total ?? subtotal - discount + shipping;
  const threshold = quote?.freeShippingThreshold;
  const remaining = quote?.amountToFreeShipping;
  const progress = threshold ? Math.min(100, (subtotal / threshold) * 100) : 0;

  return (
    <aside className="h-fit rounded-2xl border border-[#e8e1d7] bg-white p-5 shadow-[0_12px_40px_rgba(70,56,47,0.07)] lg:sticky lg:top-24">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[#46382f]">Your order</h2>
          <p className="mt-1 text-xs text-[#81786e]">{items.length} {items.length === 1 ? "item" : "items"}</p>
        </div>
        <span className="rounded-full bg-[#faf7f2] px-3 py-1 text-xs font-semibold text-[#6b665f]">Summary</span>
      </div>
      <ul className="mb-5 max-h-72 space-y-4 overflow-y-auto">
        {items.map((item) => (
          <li key={item._id} className="flex gap-3 text-sm">
            <img
              src={imageUrl(item.product?.image) || buyNowImage || IMAGE_FALLBACK}
              alt={item.product?.name || "Unavailable product"}
              onError={(event) => {
                if (event.currentTarget.src !== IMAGE_FALLBACK) {
                  event.currentTarget.src = IMAGE_FALLBACK;
                }
              }}
              className="h-16 w-16 rounded-xl border border-[#eee9e1] bg-[#faf7f2] object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-semibold leading-5 text-[#46382f]">{item.product?.name || "Unavailable product"}</p>
              {item.variantSku && <p className="mt-0.5 text-xs text-[#81786e]">{item.variantSku}</p>}
              <p className="mt-1 text-xs text-[#81786e]">Quantity: {item.quantity}</p>
              {item.problem && <p className="mt-1 text-xs text-red-600">{item.problem}</p>}
            </div>
            <span className="shrink-0 font-semibold text-[#46382f]">{formatMoney(item.lineTotal)}</span>
          </li>
        ))}
      </ul>

      {threshold != null && remaining > 0 && (
        <div className="mb-4 rounded-xl border border-[#e8e1d7] bg-[#faf7f2] p-3 text-sm text-[#46382f]">
          <p className="leading-5">
            Add <strong>{formatMoney(remaining)}</strong> more for free Standard shipping
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e8e1d7]">
            <div className="h-full rounded-full bg-[#c9a96e] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {threshold != null && remaining === null && (
        <p className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          You&apos;ve unlocked free shipping.
        </p>
      )}

      <dl className={`space-y-3 border-t border-[#eee9e1] pt-4 text-sm ${loading ? "opacity-60" : ""}`}>
        <div className="flex justify-between">
          <dt className="text-[#6b665f]">Subtotal</dt>
          <dd className="font-medium text-[#46382f]">{formatMoney(subtotal)}</dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between font-medium text-emerald-700">
            <dt>Discount</dt>
            <dd>-{formatMoney(discount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-[#6b665f]">Delivery</dt>
          <dd className="font-medium text-[#46382f]">{quote ? (shipping === 0 ? "Free" : formatMoney(shipping)) : "Calculated next"}</dd>
        </div>
        <div className="flex items-end justify-between border-t border-[#eee9e1] pt-4">
          <dt>Total</dt>
          <dd className="text-xl font-bold tracking-tight text-[#46382f]">{formatMoney(total)}</dd>
        </div>
      </dl>
      <p className="mt-4 text-center text-xs text-[#81786e]">Secure checkout · Your details are protected</p>
    </aside>
  );
}
