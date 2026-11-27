import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { closeDrawer, fetchCart, removeCartItem, updateCartItem } from "../../store/cartSlice";
import { formatMoney } from "../../utils/money";
import { showErrorToast } from "../../utils/showErrorToast";
import Sheet from "../common/Sheet";
import ResponsiveImage from "../common/ResponsiveImage";

export default function MiniCartDrawer() {
  const dispatch = useDispatch();
  const { cart, drawerOpen, status, error } = useSelector((state) => state.cart);
  const busy = status === "loading";

  const changeQuantity = async (item, quantity) => {
    try {
      await dispatch(updateCartItem({ itemId: item._id, quantity })).unwrap();
    } catch (message) {
      showErrorToast(message, "Unable to update your cart.");
    }
  };

  const remove = async (item) => {
    try {
      await dispatch(removeCartItem(item._id)).unwrap();
    } catch (message) {
      showErrorToast(message, "Unable to remove this item.");
    }
  };

  const footer = cart.items.length > 0 ? (
    <div className="space-y-3">
      <div className="flex justify-between text-base font-semibold">
        <span>Subtotal</span>
        <span>{formatMoney(cart.subtotal)}</span>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <p className="text-xs text-gray-500">Shipping and discounts are calculated at checkout.</p>
      <Link
        to="/cart"
        onClick={() => dispatch(closeDrawer())}
        className="block min-h-11 rounded-xl border border-[#c9a96e] bg-white py-3 text-center text-sm font-semibold text-[#46382f] transition hover:bg-[#faf7f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a7946]"
      >
        View cart <span aria-hidden="true">→</span>
      </Link>
    </div>
  ) : null;

  return (
    <Sheet
      open={drawerOpen}
      onClose={() => dispatch(closeDrawer())}
      title={`Your cart (${cart.itemCount})`}
      footer={footer}
    >
        {status === "loading" && cart.items.length === 0 ? (
          <p role="status" className="p-6 text-center text-sm text-gray-500">Loading your cart…</p>
        ) : error && cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p role="alert" className="text-sm text-red-700">{error}</p>
            <button type="button" onClick={() => dispatch(fetchCart())} className="text-sm text-blue-600 hover:underline">
              Try again
            </button>
          </div>
        ) : cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-gray-500">Your cart is empty.</p>
            <Link
              to="/products"
              onClick={() => dispatch(closeDrawer())}
              className="tap inline-flex items-center justify-center rounded-xl border border-[#c9a96e] bg-white px-5 text-sm font-semibold text-[#46382f] transition hover:bg-[#faf7f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a7946]"
            >
              <span aria-hidden="true">←</span> Continue shopping
            </Link>
          </div>
        ) : (
          <ul className="divide-y">
              {cart.items.map((item) => (
                <li key={item._id} className="flex gap-3 py-4">
                  {item.product.image ? (
                    <ResponsiveImage
                      src={item.product.image}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded bg-gray-100 object-cover"
                      sizes="80px"
                      width={80}
                      height={80}
                    />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">
                      No image
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      to={`/products/${item.product.slug}`}
                      onClick={() => dispatch(closeDrawer())}
                      className="font-medium hover:underline"
                    >
                      {item.product.name}
                    </Link>
                    {item.variantSku && <span className="text-xs text-gray-500">SKU {item.variantSku}</span>}
                    {!item.isAvailable && (
                      <span className="text-xs font-medium text-red-600">Unavailable or not enough stock</span>
                    )}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <div className="inline-flex items-center rounded border">
                        <button
                          type="button"
                          disabled={busy || !item.canAdjustQuantity}
                          onClick={() => changeQuantity(item, item.quantity - 1)}
                          className="tap inline-flex items-center justify-center px-2 disabled:opacity-50"
                          aria-label={`Decrease ${item.product.name} quantity`}
                        >
                          −
                        </button>
                        <span className="min-w-8 text-center text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          disabled={
                            busy ||
                            !item.canAdjustQuantity ||
                            item.quantity >= Math.min(10, item.stock)
                          }
                          onClick={() => changeQuantity(item, item.quantity + 1)}
                          className="tap inline-flex items-center justify-center px-2 disabled:opacity-50"
                          aria-label={`Increase ${item.product.name} quantity`}
                        >
                          +
                        </button>
                      </div>
                      <span className="shrink-0 text-sm font-medium">{formatMoney(item.lineTotal)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(item)}
                    className="tap-y inline-flex items-center self-start text-sm text-gray-400 hover:text-red-600 disabled:opacity-50"
                    aria-label={`Remove ${item.product.name}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
        )}
    </Sheet>
  );
}
