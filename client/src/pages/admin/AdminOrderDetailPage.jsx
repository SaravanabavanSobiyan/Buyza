import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchAdminOrder, changeOrderStatus, markOrderPaid, openOrderPdf } from "../../api/adminOrders";
import StatusBadge from "../../components/orders/StatusBadge";
import PaymentBadge from "../../components/orders/PaymentBadge";
import OrderActionDialog from "../../components/admin/OrderActionDialog";
import usePermission from "../../hooks/usePermission";
import { formatMoney } from "../../utils/money";
import { formatEta } from "../../utils/formatEta";
import { formatDateTime } from "../../utils/format";
import NotFound from "../../components/common/NotFound";
import { PageSkeleton } from "../../components/common/Skeleton";
import { showErrorToast } from "../../utils/showErrorToast";

const ACTIONS = {
  processing: { label: "Start processing", title: "Start processing this order?", description: "This marks the order as being prepared. The customer is not emailed yet." },
  shipped: { label: "Mark as shipped", title: "Mark this order as shipped?", description: "The customer will be emailed that their order is on its way." },
  delivered: { label: "Mark as delivered", title: "Mark this order as delivered?", description: "The customer will be emailed and can then review the products." },
  cancelled: { label: "Cancel order", title: "Cancel this order?", description: "Stock goes back on the shelf and the customer is emailed. This cannot be undone.", danger: true, noteLabel: "Reason for cancelling", noteRequired: true },
};
const STATUS_LABEL = { pending: "Order placed", processing: "Processing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };

export default function AdminOrderDetailPage() {
  const { orderNumber } = useParams();
  const can = usePermission();
  const [order, setOrder] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [printing, setPrinting] = useState("");
  const busy = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotFound(false);
    try {
      const data = await fetchAdminOrder(orderNumber);
      setOrder(data.order);
      setCustomer(data.customer);
    } catch (e) {
      const missing = e.response?.status === 404;
      setNotFound(missing);
      setError(missing ? "Order not found" : e.response?.data?.message || "Could not load this order");
    } finally {
      setLoading(false);
    }
  }, [orderNumber]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const runAction = async (fn, successMessage) => {
    if (busy.current) return;
    busy.current = true;
    try {
      setOrder(await fn());
      setDialog(null);
      toast.success(successMessage);
    } catch (e) {
      showErrorToast(e, "That did not work. Please try again.");
      if (e.response?.status === 409) {
        setDialog(null);
        load();
      }
    } finally {
      busy.current = false;
    }
  };

  const confirmStatus = (status, note) =>
    runAction(() => changeOrderStatus(orderNumber, { status, note }), `Order updated: ${STATUS_LABEL[status]}`);
  const confirmPaid = () => runAction(() => markOrderPaid(orderNumber), "Marked as paid");
  const printPdf = async (kind) => {
    setPrinting(kind);
    try {
      await openOrderPdf(orderNumber, kind);
    } catch (error) {
      showErrorToast(error, "Could not open the document");
    } finally {
      setPrinting("");
    }
  };

  if (loading && !order) return <PageSkeleton />;
  if (notFound) return <NotFound title="Order not found" message="This order doesn't exist or is no longer available." />;
  if (error) return <div className="mx-auto max-w-xl px-4 py-24 text-center"><p className="text-gray-600">{error}</p><div className="mt-4 flex justify-center gap-4 text-sm"><button onClick={load} className="text-indigo-600 underline">Try again</button><Link to="/admin/orders" className="text-indigo-600 underline">Back to orders</Link></div></div>;

  const address = order.shippingAddress;
  const history = [...order.statusHistory].reverse();
  const current = dialog?.type === "status" ? ACTIONS[dialog.status] : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/admin/orders" className="text-sm text-indigo-600 hover:underline">← All orders</Link>
      <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold">{order.orderNumber}</h1><p className="text-sm text-gray-500">Placed {formatDateTime(order.createdAt)}</p><div className="mt-2 flex items-center gap-2"><StatusBadge status={order.status} /><PaymentBadge status={order.payment.status} /></div></div>
        <div className="flex flex-wrap items-center gap-2">
          {order.allowedTransitions.filter((status) => status !== "cancelled").map((status) => (
            <button key={status} onClick={() => setDialog({ type: "status", status })} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">{ACTIONS[status].label}</button>
          ))}
          {order.canMarkPaid && <button onClick={() => setDialog({ type: "paid" })} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Mark as paid</button>}
          {order.allowedTransitions.includes("cancelled") && <button onClick={() => setDialog({ type: "status", status: "cancelled" })} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">Cancel order</button>}
        </div>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => printPdf("invoice")} disabled={printing === "invoice"} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50">{printing === "invoice" ? "Opening..." : "Print invoice"}</button>
        <button onClick={() => printPdf("packing-slip")} disabled={printing === "packing-slip"} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50">{printing === "packing-slip" ? "Opening..." : "Print packing slip"}</button>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border bg-white p-5"><h2 className="mb-3 font-semibold">Items</h2><ul className="divide-y">
            {order.items.map((item) => <li key={item._id} className="flex gap-3 py-3 text-sm"><img src={item.image || "https://placehold.co/64x64?text=No+Image"} alt={item.name} className="h-16 w-16 rounded object-cover" /><div className="flex-1"><p className="font-medium">{item.name}</p>{item.variantSku && <p className="text-xs text-gray-500">{item.variantSku}</p>}<p className="text-xs text-gray-500">{formatMoney(item.unitPrice)} × {item.quantity}</p></div><span className="font-medium">{formatMoney(item.lineTotal)}</span></li>)}
          </ul><dl className="mt-3 space-y-1 border-t pt-3 text-sm"><div className="flex justify-between"><dt className="text-gray-600">Subtotal</dt><dd>{formatMoney(order.subtotal)}</dd></div>{order.discount > 0 && <div className="flex justify-between text-green-700"><dt>Discount</dt><dd>-{formatMoney(order.discount)}</dd></div>}<div className="flex justify-between"><dt className="text-gray-600">Shipping ({order.shippingMethod.name})</dt><dd>{order.shipping === 0 ? "Free" : formatMoney(order.shipping)}</dd></div><div className="flex justify-between border-t pt-2 text-base font-semibold"><dt>Total</dt><dd>{formatMoney(order.total)}</dd></div></dl></section>
          <section className="grid gap-6 rounded-xl border bg-white p-5 text-sm sm:grid-cols-2">
            <div><h2 className="mb-1 font-semibold">Delivery address</h2><p className="text-gray-700">{address.fullName}<br />{address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />{address.city}, {address.province} {address.postalCode}<br /><a href={`tel:${address.phone}`} className="text-indigo-600 hover:underline">{address.phone}</a></p><p className="mt-2 text-gray-500">{order.shippingMethod.name}: {formatEta(order.shippingMethod.etaMin, order.shippingMethod.etaMax)}</p></div>
            <div><h2 className="mb-1 font-semibold">Payment</h2><p className="text-gray-700">{order.payment.method === "cod" ? "Cash on delivery" : "Card"}</p><p className="mt-1"><PaymentBadge status={order.payment.status} /></p>{order.payment.paidAt && <p className="mt-1 text-xs text-gray-500">Paid {formatDateTime(order.payment.paidAt)}</p>}{order.payment.status === "refund_pending" && <p className="mt-2 rounded bg-orange-50 p-2 text-xs text-orange-800">This order was paid and then cancelled: a refund is due to the customer.</p>}</div>
          </section>
        </div>
        <div className="space-y-6">
          <section className="rounded-xl border bg-white p-5 text-sm"><h2 className="mb-2 font-semibold">Customer</h2>{customer ? <><p className="font-medium">{customer.name}{customer.isBlocked && <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Blocked</span>}</p><a href={`mailto:${customer.email}`} className="text-indigo-600 hover:underline">{customer.email}</a><p className="mt-2 text-gray-500">{customer.ordersCount} order{customer.ordersCount === 1 ? "" : "s"} · customer since {formatDateTime(customer.since).split(",")[0]}</p>{can("customers:read") && <Link to={`/admin/customers/${customer._id}`} className="mt-2 inline-block text-indigo-600 hover:underline">View customer</Link>}</> : <><p className="font-medium">{address.fullName} <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">Guest checkout</span></p><a href={`mailto:${order.email}`} className="text-indigo-600 hover:underline">{order.email}</a></>}</section>
          <section className="rounded-xl border bg-white p-5 text-sm"><h2 className="mb-3 font-semibold">History</h2><ol className="space-y-3">{history.map((entry, index) => <li key={`${entry.status}-${entry.at}-${index}`} className="flex gap-3"><span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${entry.status === "cancelled" ? "bg-red-500" : "bg-indigo-600"}`} /><div><p className="font-medium">{STATUS_LABEL[entry.status] || entry.status}</p><p className="text-xs text-gray-500">{formatDateTime(entry.at)}</p>{entry.note && <p className="mt-0.5 text-xs text-gray-600">{entry.note}</p>}</div></li>)}</ol></section>
        </div>
      </div>
      {current && <OrderActionDialog title={current.title} description={current.description} confirmLabel={current.label} danger={current.danger} noteLabel={current.noteLabel || "Note for the history"} noteRequired={current.noteRequired} onClose={() => setDialog(null)} onConfirm={(note) => confirmStatus(dialog.status, note)} />}
      {dialog?.type === "paid" && <OrderActionDialog title="Mark this order as paid?" description={`Confirm that you received ${formatMoney(order.total)} in cash for ${order.orderNumber}.`} confirmLabel="Yes, payment received" onClose={() => setDialog(null)} onConfirm={confirmPaid} />}
    </div>
  );
}
