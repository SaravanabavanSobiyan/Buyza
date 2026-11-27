import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  cancelOrder,
  downloadInvoice,
  fetchOrder,
} from "../api/orders";
import CancelOrderModal from "../components/orders/CancelOrderModal";
import OrderTimeline from "../components/orders/OrderTimeline";
import StatusBadge from "../components/orders/StatusBadge";
import NotFound from "../components/common/NotFound";
import { PageSkeleton } from "../components/common/Skeleton";
import { showErrorToast } from "../utils/showErrorToast";
import { formatDateTime } from "../utils/format";
import { formatEta } from "../utils/formatEta";
import { formatMoney } from "../utils/money";

const PAYMENT_STATUS = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refund_pending: "Refund in progress",
  refunded: "Refunded",
};

export default function OrderDetailPage() {
  const { orderNumber } = useParams();
  const [result, setResult] = useState({
    orderNumber: null,
    order: null,
    error: "",
    notFound: false,
  });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const isCurrentOrder = result.orderNumber === orderNumber;
  const order = isCurrentOrder ? result.order : null;
  const error = isCurrentOrder ? result.error : "";
  const loading = !isCurrentOrder;

  useEffect(() => {
    let active = true;
    fetchOrder(orderNumber)
      .then((result) => {
        if (active) {
          setResult({ orderNumber, order: result, error: "", notFound: false });
        }
      })
      .catch((requestError) => {
        if (active) {
          setResult({
            orderNumber,
            order: null,
            error:
              requestError.response?.status === 404
                ? "Order not found"
                : "Could not load this order",
            notFound: requestError.response?.status === 404,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [orderNumber]);

  const handleCancel = async (body) => {
    try {
      const updated = await cancelOrder(orderNumber, body);
      setResult({ orderNumber, order: updated, error: "" });
      setCancelOpen(false);
      toast.success("Order cancelled");
    } catch (requestError) {
      showErrorToast(requestError, "Could not cancel this order");
      setCancelOpen(false);
      try {
        setResult({
          orderNumber,
          order: await fetchOrder(orderNumber),
          error: "",
        });
      } catch (error) {
        showErrorToast(error, "Could not refresh the order status");
      }
    }
  };

  const handleInvoice = async () => {
    try {
      setDownloading(true);
      await downloadInvoice(orderNumber);
    } catch (error) {
      showErrorToast(error, "Could not download the invoice");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <PageSkeleton />;

  if (isCurrentOrder && result.notFound) {
    return (
      <NotFound
        title="Order not found"
        message="This order doesn't exist or is no longer available."
      />
    );
  }
  if (error || !order) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-gray-600">{error || "Order not found"}</p>
        <Link to="/orders" className="mt-4 inline-block text-indigo-600 underline">
          Back to my orders
        </Link>
      </main>
    );
  }

  const address = order.shippingAddress;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/orders" className="text-sm text-indigo-600 hover:underline">
        ← My orders
      </Link>

      <div className="mb-6 mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{order.orderNumber}</h1>
          <p className="text-sm text-gray-500">
            Placed on {formatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={order.status} />
          <button
            onClick={handleInvoice}
            disabled={downloading}
            className="rounded-lg border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
          >
            {downloading ? "Preparing..." : "Download invoice"}
          </button>
          {order.canCancel && (
            <button
              onClick={() => setCancelOpen(true)}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Cancel order
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border bg-white p-5">
            <h2 className="mb-3 font-semibold">Items</h2>
            <ul className="divide-y">
              {order.items.map((item) => (
                <li key={item._id} className="flex gap-3 py-3 text-sm">
                  <img
                    src={item.image || "https://placehold.co/64x64?text=No+Image"}
                    alt={item.name}
                    className="h-16 w-16 rounded object-cover"
                  />
                  <div className="flex-1">
                    {item.slug ? (
                      <Link
                        to={`/products/${item.slug}`}
                        className="font-medium hover:underline"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <p className="font-medium">{item.name}</p>
                    )}
                    {item.variantSku && (
                      <p className="text-xs text-gray-500">{item.variantSku}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {formatMoney(item.unitPrice)} × {item.quantity}
                    </p>
                    {order.status === "delivered" && item.slug && (
                      <Link
                        to={`/products/${item.slug}#reviews`}
                        className="mt-1 inline-block text-xs font-medium text-indigo-600 hover:underline"
                      >
                        Write a review
                      </Link>
                    )}
                  </div>
                  <span className="font-medium">{formatMoney(item.lineTotal)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-3 space-y-1 border-t pt-3 text-sm">
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
                <dt className="text-gray-600">
                  Shipping ({order.shippingMethod.name})
                </dt>
                <dd>{order.shipping === 0 ? "Free" : formatMoney(order.shipping)}</dd>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatMoney(order.total)}</dd>
              </div>
            </dl>
          </section>

          <section className="grid gap-6 rounded-xl border bg-white p-5 text-sm sm:grid-cols-2">
            <div>
              <h2 className="mb-1 font-semibold">Delivery address</h2>
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
              <p className="mt-2 text-gray-500">
                {order.shippingMethod.name}:{" "}
                {formatEta(
                  order.shippingMethod.etaMin,
                  order.shippingMethod.etaMax
                )}
              </p>
            </div>
            <div>
              <h2 className="mb-1 font-semibold">Payment</h2>
              <p className="text-gray-700">
                {order.payment.method === "cod" ? "Cash on delivery" : "Card"}
              </p>
              <p className="text-gray-500">
                Status: {PAYMENT_STATUS[order.payment.status] || order.payment.status}
              </p>
              {order.payment.transactionId && (
                <p className="text-xs text-gray-400">
                  Ref: {order.payment.transactionId}
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="h-fit rounded-xl border bg-white p-5">
          <h2 className="mb-4 font-semibold">Order status</h2>
          <OrderTimeline order={order} />
        </section>
      </div>

      {cancelOpen && (
        <CancelOrderModal
          orderNumber={order.orderNumber}
          paymentStatus={order.payment.status}
          onClose={() => setCancelOpen(false)}
          onConfirm={handleCancel}
        />
      )}
    </main>
  );
}
