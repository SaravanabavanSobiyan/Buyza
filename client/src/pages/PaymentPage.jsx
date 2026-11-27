import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { selectPayment } from "../store/checkoutSlice";
import useCheckoutGuard from "../hooks/useCheckoutGuard";
import CheckoutSteps from "../components/checkout/CheckoutSteps";
import CheckoutSkeleton from "../components/checkout/CheckoutSkeleton";
import OrderSummary from "../components/checkout/OrderSummary";

export default function PaymentPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const guard = useCheckoutGuard();
  const { cart } = useSelector((state) => state.cart);
  const { quote, paymentMethod, buyNowItem } = useSelector((state) => state.checkout);

  if (guard === "loading") return <CheckoutSkeleton />;
  if (guard) return <Navigate to={guard} replace />;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-12 sm:py-12">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-[#46382f] sm:text-4xl">Checkout</h1>
      </header>
      <CheckoutSteps current={1} />
      <div className="grid items-start gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-[#e8e1d7] bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <h2 className="mt-1 text-xl font-bold tracking-tight text-[#46382f]">Payment method</h2>
              <p className="mt-1 text-sm text-[#6b665f]">Select a secure way to complete your purchase.</p>
            </div>
            <div className="space-y-3">
              <label
                className={`flex min-h-16 cursor-pointer items-start gap-4 rounded-2xl border p-4 transition sm:p-5 ${
                  paymentMethod === "cod"
                    ? "border-[#c9a96e] bg-[#faf7f2] shadow-[0_0_0_1px_#c9a96e]"
                    : "border-[#e8e1d7] hover:border-[#c9a96e]/70"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  className="mt-1 h-4 w-4 accent-[#46382f]"
                  checked={paymentMethod === "cod"}
                  onChange={() => dispatch(selectPayment("cod"))}
                />
                <span className="flex-1">
                  <span className="block font-semibold text-[#46382f]">Cash on delivery</span>
                  <span className="mt-1 block text-sm leading-5 text-[#6b665f]">
                    Pay in cash when your order arrives at your door.
                  </span>
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6b665f]">Available</span>
              </label>
              <label className="flex cursor-not-allowed items-start gap-4 rounded-2xl border border-[#eee9e1] bg-[#faf9f7] p-4 opacity-60 sm:p-5">
                <input type="radio" name="payment" className="mt-1 h-4 w-4" disabled />
                <span className="flex-1">
                  <span className="block font-semibold text-[#46382f]">Credit or debit card</span>
                  <span className="mt-1 block text-sm text-[#6b665f]">Card payments are coming soon.</span>
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#81786e]">Coming soon</span>
              </label>
            </div>
          </section>

          <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-[#e8e1d7] pt-5 sm:flex-row sm:items-center">
            <Link to="/checkout" className="tap inline-flex items-center justify-center rounded-xl px-4 text-center text-sm font-semibold text-[#6b665f] transition hover:bg-white hover:text-[#46382f] sm:text-left">
              ← Back to delivery
            </Link>
            <button
              type="button"
              onClick={() => navigate("/checkout/review")}
              className="min-h-11 rounded-xl bg-[#46382f] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#332920] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a7946]"
            >
              Review your order <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
        <OrderSummary quote={quote} cart={cart} buyNowItem={buyNowItem} />
      </div>
    </main>
  );
}
