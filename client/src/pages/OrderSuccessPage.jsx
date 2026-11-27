import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import { resetCheckout } from "../store/checkoutSlice";
import { formatMoney } from "../utils/money";
import { formatEta } from "../utils/formatEta";

export default function OrderSuccessPage() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { lastOrder: order, lastOrderWarning } = useSelector((state) => state.checkout);

  useEffect(() => {
    dispatch(resetCheckout());
  }, [dispatch]);

  if (!order) return <Navigate to="/" replace />;

  const address = order.shippingAddress;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
          ✓
        </div>
        <h1 className="text-2xl font-semibold">Thank you for your order!</h1>
        <p className="mt-2 text-gray-600">
          Your order number is{" "}
          <strong className="text-gray-900">{order.orderNumber}</strong>
        </p>
        <p className="text-sm text-gray-500">Order updates will be sent to {order.email}</p>
        {lastOrderWarning && (
          <p role="status" className="mt-3 text-sm text-amber-700">
            {lastOrderWarning}
          </p>
        )}
      </div>

      <section className="space-y-5 rounded-xl border bg-white p-5">
        <ul className="divide-y">
          {order.items.map((item) => (
            <li key={item._id} className="flex gap-3 py-3 text-sm">
              <img
                src={item.image || "https://placehold.co/56x56?text=No+Image"}
                alt={item.name}
                className="h-14 w-14 rounded object-cover"
              />
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                {item.variantSku && (
                  <p className="text-xs text-gray-500">{item.variantSku}</p>
                )}
                <p className="text-xs text-gray-500">Qty {item.quantity}</p>
              </div>
              <span>{formatMoney(item.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <dl className="space-y-1 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">Subtotal</dt>
            <dd>{formatMoney(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-green-700">
              <dt>Discount</dt>
              <dd>-{formatMoney(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-gray-600">Shipping ({order.shippingMethod.name})</dt>
            <dd>{order.shipping === 0 ? "Free" : formatMoney(order.shipping)}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatMoney(order.total)}</dd>
          </div>
        </dl>

        <div className="grid gap-4 border-t pt-4 text-sm sm:grid-cols-2">
          <div>
            <h2 className="mb-1 font-semibold">Delivering to</h2>
            <p className="text-gray-700">
              {address.fullName}
              <br />
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}
              <br />
              {address.city}, {address.province} {address.postalCode}
              <br />
              {address.phone}
            </p>
            <p className="mt-1 text-gray-500">
              {formatEta(order.shippingMethod.etaMin, order.shippingMethod.etaMax)}
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-semibold">Payment</h2>
            <p className="text-gray-700">
              {order.payment.method === "cod" ? "Cash on delivery" : "Card"}
            </p>
            {order.payment.method === "cod" && (
              <p className="mt-1 text-gray-500">
                Please pay {formatMoney(order.total)} on delivery.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/products"
          className="rounded-xl border border-[#c9a96e] bg-white px-6 py-3 text-sm font-semibold text-[#46382f] transition hover:bg-[#faf7f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a7946]"
        >
          <span aria-hidden="true">←</span> Continue shopping
        </Link>
        {user && (
          <Link
            to="/orders"
            className="rounded-xl bg-[#46382f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2e251f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a7946]"
          >
            View my orders
          </Link>
        )}
      </div>
    </main>
  );
}
