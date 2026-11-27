import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchCart } from "../store/cartSlice";
import {
  ensureIdempotencyKey,
  placeOrder,
} from "../store/checkoutSlice";
import CheckoutSteps from "../components/checkout/CheckoutSteps";
import CheckoutSkeleton from "../components/checkout/CheckoutSkeleton";
import OrderSummary from "../components/checkout/OrderSummary";
import { formatEta } from "../utils/formatEta";
import useCheckoutGuard from "../hooks/useCheckoutGuard";
import { showErrorToast } from "../utils/showErrorToast";
import StickyActionBar from "../components/common/StickyActionBar";
import { formatMoney } from "../utils/money";

export default function ReviewPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const guard = useCheckoutGuard();
  const submitting = useRef(false);
  const user = useSelector((state) => state.auth.user);
  const { cart } = useSelector((state) => state.cart);
  const {
    address,
    email,
    buyNowItem,
    quote,
    selectedShippingId,
    paymentMethod,
    idempotencyKey,
    placing,
    placeError,
  } = useSelector((state) => state.checkout);

  useEffect(() => {
    dispatch(ensureIdempotencyKey());
  }, [dispatch, selectedShippingId, address]);

  if (guard === "loading") return <CheckoutSkeleton />;
  if (guard) return <Navigate to={guard} replace />;

  const shipping = quote.options.find((option) => option.id === selectedShippingId);

  const handlePlaceOrder = async () => {
    if (submitting.current || !idempotencyKey) return;
    submitting.current = true;
    try {
      const result = await dispatch(placeOrder()).unwrap();
      if (result.warning) toast(result.warning, { duration: 7000 });
      navigate("/order-success", { replace: true });
      dispatch(fetchCart());
    } catch (error) {
      showErrorToast(error, "Could not place your order.");
    } finally {
      submitting.current = false;
    }
  };

  const cartProblem = placeError && (placeError.status === 409 || placeError.status === 400);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-32 sm:py-12 md:pb-12">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-[#46382f] sm:text-4xl">Review your order</h1>
        <p className="mt-2 text-sm text-[#6b665f]">Take a moment to make sure everything looks right.</p>
      </header>
      <CheckoutSteps current={2} />
      <div className="grid items-start gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-[#e8e1d7] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9a7946]">Delivering to</p>
                <h2 className="mt-1 text-lg font-bold text-[#46382f]">Shipping address</h2>
              </div>
              <Link to="/checkout" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#9a7946] transition hover:bg-[#faf7f2]">
                Edit
              </Link>
            </div>
            <div className="rounded-xl bg-[#faf7f2] p-4 text-sm leading-6 text-[#46382f]">
              <p className="font-semibold">{address.fullName}</p>
              <p className="text-[#6b665f]">{address.phone}</p>
              <p className="mt-2 text-[#6b665f]">
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}
              <br />
              {address.city}, {address.province} {address.postalCode}
              </p>
            </div>
            <p className="mt-3 text-sm text-[#81786e]">
              Confirmation will be sent to {user?.email || email}
            </p>
          </section>

          <section className="rounded-2xl border border-[#e8e1d7] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9a7946]">Arriving</p>
                <h2 className="mt-1 text-lg font-bold text-[#46382f]">Delivery method</h2>
              </div>
              <Link to="/checkout" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#9a7946] transition hover:bg-[#faf7f2]">
                Edit
              </Link>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-[#faf7f2] p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[10px] font-bold text-[#9a7946]" aria-hidden="true">SHIP</span>
              <div>
                <p className="font-semibold text-[#46382f]">{shipping?.name}</p>
                <p className="mt-0.5 text-sm text-[#6b665f]">{formatEta(shipping?.etaMin, shipping?.etaMax)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#e8e1d7] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9a7946]">Paying with</p>
                <h2 className="mt-1 text-lg font-bold text-[#46382f]">Payment method</h2>
              </div>
              <Link
                to="/checkout/payment"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-[#9a7946] transition hover:bg-[#faf7f2]"
              >
                Edit
              </Link>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-[#faf7f2] p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[10px] font-bold text-[#9a7946]" aria-hidden="true">
                {paymentMethod === "cod" ? "COD" : "CARD"}
              </span>
              <p className="font-semibold text-[#46382f]">{paymentMethod === "cod" ? "Cash on delivery" : "Card"}</p>
            </div>
          </section>

          {placeError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {placeError.message}{" "}
              {cartProblem && (
                <Link to="/cart" className="font-medium underline">
                  Review your cart
                </Link>
              )}
            </div>
          )}

          <p className="text-xs text-gray-500">
            By placing your order you agree to our{" "}
            <Link to="/terms" target="_blank" rel="noopener noreferrer" className="underline">Terms of service</Link>{" "}
            and <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy policy</Link>.
          </p>
          <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-[#e8e1d7] pt-5 sm:flex-row sm:items-center">
            <Link
              to="/checkout/payment"
              className="tap inline-flex items-center justify-center rounded-xl px-4 text-center text-sm font-semibold text-[#6b665f] transition hover:bg-white hover:text-[#46382f] sm:text-left"
            >
              ← Back to payment
            </Link>
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={placing || !idempotencyKey}
              className="hidden min-h-11 rounded-xl bg-[#46382f] px-8 text-sm font-semibold text-white shadow-sm transition hover:bg-[#332920] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a7946] disabled:cursor-not-allowed disabled:opacity-50 md:inline-flex md:items-center md:justify-center"
            >
              {placing ? "Placing your order..." : "Place order"}
            </button>
          </div>
        </div>
        <OrderSummary quote={quote} cart={cart} buyNowItem={buyNowItem} />
      </div>
      <StickyActionBar>
        <span className="shrink-0 text-sm font-semibold text-[#46382f]">
          {formatMoney(quote.total)}
        </span>
        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={placing || !idempotencyKey}
          className="min-h-11 flex-1 rounded-xl bg-[#46382f] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {placing ? "Placing order..." : "Place order"}
        </button>
      </StickyActionBar>
    </main>
  );
}
