import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAddresses } from "../api/account";
import { getErrorMessage } from "../api/axios";
import AddressForm from "../components/checkout/AddressForm";
import OrderSummary from "../components/checkout/OrderSummary";
import ShippingOptions from "../components/checkout/ShippingOptions";
import CheckoutSteps from "../components/checkout/CheckoutSteps";
import { PageSkeleton } from "../components/common/Skeleton";
import { showErrorToast } from "../utils/showErrorToast";
import {
  clearQuote,
  fetchQuote,
  selectShipping,
  setAddress,
  setAddressId,
  setEmail,
} from "../store/checkoutSlice";

export default function Checkout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const { cart, loaded, status: cartStatus } = useSelector((state) => state.cart);
  const {
    address,
    addressId,
    buyNowItem,
    email,
    quote,
    selectedShippingId,
    status,
    error,
  } = useSelector((state) => state.checkout);
  const [submitted, setSubmitted] = useState(false);
  const loading = status === "loading";
  const cartFingerprint = useMemo(
    () =>
      JSON.stringify(
        cart.items.map(({ _id, quantity, unitPrice, isAvailable }) => [
          _id,
          quantity,
          unitPrice,
          isAvailable,
        ])
      ),
    [cart.items]
  );
  const previousCartFingerprint = useRef(null);

  const {
    data: savedAddresses = [],
    error: savedAddressError,
  } = useQuery({
    queryKey: ["addresses"],
    queryFn: getAddresses,
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (
      previousCartFingerprint.current !== null &&
      previousCartFingerprint.current !== cartFingerprint
    ) {
      dispatch(clearQuote());
      setSubmitted(false);
    }
    previousCartFingerprint.current = cartFingerprint;
  }, [cartFingerprint, dispatch]);

  if (!loaded || (user && cartStatus === "loading")) {
    return <PageSkeleton />;
  }

  if (
    !buyNowItem &&
    (cart.items.length === 0 || cart.items.some((item) => !item.isAvailable))
  ) {
    return <Navigate to="/cart" replace />;
  }

  const handleAddressSubmit = async (result) => {
    dispatch(setAddress(result.address));
    dispatch(setAddressId(result.addressId));
    dispatch(setEmail(result.email));
    dispatch(clearQuote());
    setSubmitted(true);

    try {
      await dispatch(fetchQuote(null)).unwrap();
    } catch (message) {
      showErrorToast(message, "Could not update your shipping quote.");
    }
  };

  const handleShippingSelect = async (id) => {
    dispatch(selectShipping(id));
    try {
      await dispatch(fetchQuote(id)).unwrap();
    } catch (message) {
      showErrorToast(message, "Could not update your shipping quote.");
    }
  };

  const canContinue =
    Boolean(quote && selectedShippingId && quote.canCheckout) && !loading;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-[#46382f] sm:text-4xl">Checkout</h1>
      </header>
      <CheckoutSteps current={0} />
      <div className="grid items-start gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-[#e8e1d7] bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <h2 className="mt-1 text-xl font-bold tracking-tight text-[#46382f]">Where should we deliver?</h2>
              <p className="mt-1 text-sm text-[#6b665f]">Enter the address where you’d like to receive your order.</p>
            </div>
            <AddressForm
              initial={address}
              initialAddressId={addressId}
              initialEmail={email}
              needEmail={!user}
              savedAddresses={savedAddresses}
              savedAddressesError={
                savedAddressError ? getErrorMessage(savedAddressError) : ""
              }
              submitting={loading}
              onChange={() => {
                if (quote || submitted) {
                  dispatch(clearQuote());
                  setSubmitted(false);
                }
              }}
              onSubmit={handleAddressSubmit}
            />
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}{" "}
              <Link to="/cart" className="font-medium underline">
                Back to cart
              </Link>
            </div>
          )}

          {quote && (
            <>
              {quote.problems.length > 0 && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  Some cart items are no longer available. Return to your cart to review them.
                  <ul className="mt-2 list-inside list-disc">
                    {quote.problems.map((problem, index) => (
                      <li key={`${problem.productId || problem.type}-${index}`}>
                        {problem.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <section className="rounded-2xl border border-[#e8e1d7] bg-white p-5 shadow-sm sm:p-7">
                <ShippingOptions
                  options={quote.options}
                  selectedId={selectedShippingId}
                  onSelect={handleShippingSelect}
                  disabled={loading}
                />
              </section>
            </>
          )}

          <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-[#e8e1d7] pt-5 sm:flex-row sm:items-center">
            <Link to="/cart" className="tap inline-flex items-center justify-center rounded-xl px-4 text-center text-sm font-semibold text-[#6b665f] transition hover:bg-white hover:text-[#46382f] sm:text-left">
              ← Back to cart
            </Link>
            <button
              type="button"
              disabled={!canContinue}
              onClick={() => navigate("/checkout/payment")}
              className="min-h-11 rounded-xl bg-[#46382f] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#332920] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a7946] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue to payment <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        <OrderSummary quote={quote} cart={cart} buyNowItem={buyNowItem} loading={loading} />
      </div>
    </main>
  );
}
