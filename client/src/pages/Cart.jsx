import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { clearCart, fetchCart, removeCartItem, updateCartItem } from "../store/cartSlice";
import { formatMoney } from "../utils/money";
import QuantityStepper from "../components/QuantityStepper";
import { PageSkeleton } from "../components/common/Skeleton";
import { showErrorToast } from "../utils/showErrorToast";

export default function Cart() {
  const dispatch = useDispatch();
  const { cart, status, error } = useSelector((state) => state.cart);
  const busy = status === "loading";
  const hasUnavailable = cart.items.some((item) => !item.isAvailable);
  const canCheckout = cart.items.length > 0 && !hasUnavailable && !busy;

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  const updateQuantity = async (item, quantity) => {
    try {
      await dispatch(updateCartItem({ itemId: item._id, quantity })).unwrap();
    } catch (message) {
      showErrorToast(message, "Unable to update your cart.");
    }
  };

  const remove = async (item) => {
    try {
      await dispatch(removeCartItem(item._id)).unwrap();
      toast.success("Item removed");
    } catch (message) {
      showErrorToast(message, "Unable to remove this item.");
    }
  };

  const clear = async () => {
    if (!window.confirm("Remove all items from your cart?")) return;
    try {
      await dispatch(clearCart()).unwrap();
      toast.success("Cart cleared");
    } catch (message) {
      showErrorToast(message, "Unable to clear your cart.");
    }
  };

  if (status === "loading" && cart.items.length === 0) {
    return <PageSkeleton />;
  }

  if (error && cart.items.length === 0) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Your cart</h1>
        <div className="mt-6 rounded-xl border border-red-200 bg-white p-8 text-center">
          <p role="alert" className="text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => dispatch(fetchCart())}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      {cart.items.length > 0 && (
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Shopping cart</h1>
          <button
            type="button"
            onClick={clear}
            disabled={busy}
            className="text-sm text-gray-500 hover:text-red-600 disabled:opacity-50"
          >
            Clear cart
          </button>
        </div>
      )}

      {cart.items.length === 0 ? (
        <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
          <div className="mb-4 text-6xl" aria-hidden="true">🛒</div>
          <h1 className="text-2xl font-semibold">Your cart is empty</h1>
          <p className="mt-2 text-gray-500">Looks like you haven't added anything yet.</p>
          <Link
            to="/products"
            className="mt-6 rounded-xl border border-[#c9a96e] bg-white px-6 py-3 text-sm font-semibold text-[#46382f] transition hover:bg-[#faf7f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a7946]"
          >
            <span aria-hidden="true">←</span> Start shopping
          </Link>
        </div>
      ) : (
        <>
          {hasUnavailable && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Some items are unavailable or have limited stock. Update or remove them before checkout.
            </div>
          )}
          {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
          <div className="grid gap-8 lg:grid-cols-3">
          <ul className={`divide-y rounded-xl border bg-white px-4 lg:col-span-2 ${busy ? "opacity-70" : ""}`}>
            {cart.items.map((item) => (
              <li key={item._id} className={`flex gap-4 py-5 ${!item.isAvailable ? "bg-red-50/60" : ""}`}>
                {item.product.image ? (
                  <Link to={`/products/${item.product.slug}`} className="shrink-0">
                    <img src={item.product.image} alt={item.product.name} className="h-24 w-24 rounded-lg bg-gray-100 object-cover" />
                  </Link>
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                    No image
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-4">
                    <div>
                      <Link to={`/products/${item.product.slug}`} className="font-medium hover:underline">
                        {item.product.name}
                      </Link>
                      {item.variantSku && <p className="text-sm text-gray-500">Option: {item.variantSku}</p>}
                      <p className="text-sm text-gray-500">{formatMoney(item.unitPrice)} each</p>
                    </div>
                    <p className="font-semibold">{formatMoney(item.lineTotal)}</p>
                  </div>
                  {!item.isAvailable && (
                    <p className="mt-1 text-sm font-medium text-red-600">
                      {!item.canAdjustQuantity
                        ? "This item is unavailable. Remove it to continue."
                        : item.stock === 0
                          ? "This item is out of stock. Remove it to continue."
                          : `Only ${item.stock} left. Lower the quantity or remove it to continue.`}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <QuantityStepper
                      value={item.quantity}
                      max={Math.min(10, item.stock || item.quantity)}
                      disabled={busy || !item.canAdjustQuantity}
                      onChange={(quantity) => updateQuantity(item, quantity)}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(item)}
                      className="text-sm text-red-600 hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-xl border bg-white p-5 shadow-sm lg:sticky lg:top-24">
            <h2 className="mb-4 text-lg font-semibold">Order summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Subtotal ({cart.itemCount} items)</dt>
                <dd>{formatMoney(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Shipping</dt>
                <dd>{cart.shipping > 0 ? formatMoney(cart.shipping) : "Calculated at checkout"}</dd>
              </div>
              {cart.discount > 0 && (
                <div className="flex justify-between text-green-700">
                  <dt>Discount</dt>
                  <dd>-{formatMoney(cart.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatMoney(cart.total)}</dd>
              </div>
            </dl>
            {canCheckout ? (
              <Link
                to="/checkout"
                className="mt-5 block rounded-xl bg-[#46382f] py-3.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-[#332920] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a7946]"
              >
                Proceed to checkout <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="mt-5 block w-full cursor-not-allowed rounded-xl bg-[#b8afa4] py-3.5 text-center text-sm font-semibold text-white opacity-70"
              >
                Proceed to checkout <span aria-hidden="true">→</span>
              </button>
            )}
            <Link
              to="/products"
              className="mt-3 block rounded-xl border border-[#c9a96e] bg-white py-3 text-center text-sm font-semibold text-[#46382f] transition hover:bg-[#faf7f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a7946]"
            >
              <span aria-hidden="true">←</span> Continue shopping
            </Link>
          </aside>
          </div>
        </>
      )}
    </main>
  );
}
