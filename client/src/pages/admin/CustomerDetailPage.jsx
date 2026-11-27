import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchCustomer, fetchCustomerOrders, blockCustomer, unblockCustomer } from "../../api/adminCustomers";
import StatusBadge from "../../components/orders/StatusBadge";
import PaymentBadge from "../../components/orders/PaymentBadge";
import Pagination from "../../components/Pagination";
import OrderActionDialog from "../../components/admin/OrderActionDialog";
import usePermission from "../../hooks/usePermission";
import { formatDate, formatDateTime } from "../../utils/format";
import { formatMoney } from "../../utils/money";
import NotFound from "../../components/common/NotFound";
import { PageSkeleton } from "../../components/common/Skeleton";
import { showErrorToast } from "../../utils/showErrorToast";

function Stat({ label, value, hint }) {
  return <div className="rounded-xl border bg-white p-4"><p className="text-xs uppercase tracking-wide text-gray-500">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p>{hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}</div>;
}

function CustomerOrders({ customerId }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await fetchCustomerOrders(customerId, { page, limit: 10 })); }
    catch (e) { setError(e.response?.data?.message || "Could not load orders"); }
    finally { setLoading(false); }
  }, [customerId, page]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  return (
    <section className="rounded-xl border bg-white">
      <h2 className="border-b px-5 py-3 font-semibold">Order history</h2>
      {error && <p role="alert" className="p-5 text-sm text-red-700">{error} <button onClick={load} className="font-medium underline">Try again</button></p>}
      {loading && !data && <div className="m-5 h-24 animate-pulse rounded bg-gray-200" />}
      {data && data.orders.length === 0 && <p className="p-5 text-sm text-gray-500">This customer hasn't placed any orders yet.</p>}
      {data && data.orders.length > 0 && <div className={`overflow-x-auto ${loading ? "opacity-60" : ""}`}><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-5 py-2">Order</th><th className="px-5 py-2">Date</th><th className="px-5 py-2 text-right">Items</th><th className="px-5 py-2 text-right">Total</th><th className="px-5 py-2">Payment</th><th className="px-5 py-2">Status</th></tr></thead><tbody className="divide-y">{data.orders.map((o) => <tr key={o._id}><td className="whitespace-nowrap px-5 py-2.5 font-medium"><Link to={`/admin/orders/${o.orderNumber}`} className="text-indigo-600 hover:underline">{o.orderNumber}</Link></td><td className="whitespace-nowrap px-5 py-2.5 text-gray-600">{formatDate(o.createdAt)}</td><td className="px-5 py-2.5 text-right">{o.itemCount}</td><td className="whitespace-nowrap px-5 py-2.5 text-right font-medium">{formatMoney(o.total)}</td><td className="px-5 py-2.5"><PaymentBadge status={o.payment.status} /></td><td className="px-5 py-2.5"><StatusBadge status={o.status} /></td></tr>)}</tbody></table></div>}
      {data && <div className="px-5 pb-4"><Pagination page={data.page} pages={data.totalPages} onChange={setPage} /></div>}
    </section>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const can = usePermission();
  const [customer, setCustomer] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [dialog, setDialog] = useState(null);
  const busy = useRef(false);

  const load = useCallback(async () => {
    setLoading(true); setError(""); setNotFound(false);
    try { const data = await fetchCustomer(id); setCustomer(data.customer); setStats(data.stats); }
    catch (e) {
      const missing = e.response?.status === 404;
      setNotFound(missing);
      setError(missing ? "Customer not found" : e.response?.data?.message || "Could not load this customer");
    }
    finally { setLoading(false); }
  }, [id]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const run = async (fn, successMessage) => {
    if (busy.current) return;
    busy.current = true;
    try { const result = await fn(); setDialog(null); toast.success(successMessage(result)); await load(); }
    catch (e) { showErrorToast(e, "That did not work. Please try again."); }
    finally { busy.current = false; }
  };
  if (loading && !customer) return <PageSkeleton />;
  if (notFound) return <NotFound title="Customer not found" message="This customer doesn't exist or is no longer available." />;
  if (error) return <div className="mx-auto max-w-xl px-4 py-24 text-center"><p className="text-gray-600">{error}</p><div className="mt-4 flex justify-center gap-4 text-sm"><button onClick={load} className="text-indigo-600 underline">Try again</button><Link to="/admin/customers" className="text-indigo-600 underline">Back to customers</Link></div></div>;
  const addresses = customer.addresses || [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/admin/customers" className="text-sm text-indigo-600 hover:underline">← All customers</Link>
      <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold">{customer.name}{customer.isBlocked && <span className="ml-3 rounded-full bg-red-100 px-3 py-1 align-middle text-xs font-semibold text-red-700">Blocked</span>}</h1><a href={`mailto:${customer.email}`} className="text-sm text-indigo-600 hover:underline">{customer.email}</a>{customer.phone && <p className="text-sm text-gray-500">{customer.phone}</p>}</div>
        {can("customers:block") && (customer.isBlocked ? <button onClick={() => setDialog("unblock")} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white">Unblock customer</button> : <button onClick={() => setDialog("block")} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">Block customer</button>)}
      </div>
      {customer.isBlocked && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p className="font-semibold">This account is blocked: they can't log in or place orders with it.</p><p className="mt-1">Reason: {customer.blockedReason || "Not recorded"}</p><p className="text-red-700">{customer.blockedAt && `Blocked ${formatDateTime(customer.blockedAt)}`}{customer.blockedBy && ` by ${customer.blockedBy.name}`}</p>{stats.openOrders > 0 && <p className="mt-2">They still have {stats.openOrders} open order{stats.openOrders === 1 ? "" : "s"}.</p>}</div>}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Orders" value={stats.ordersCount} hint={stats.cancelledCount ? `${stats.cancelledCount} cancelled` : undefined} /><Stat label="Total spent" value={formatMoney(stats.totalSpent)} hint="Excludes cancelled" /><Stat label="Average order" value={formatMoney(stats.averageOrderValue)} /><Stat label="Open orders" value={stats.openOrders} /><Stat label="Last order" value={stats.lastOrderAt ? formatDate(stats.lastOrderAt) : "-"} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3"><div className="lg:col-span-2"><CustomerOrders customerId={id} /></div><div className="space-y-6"><section className="rounded-xl border bg-white p-5 text-sm"><h2 className="mb-2 font-semibold">Account</h2><dl className="space-y-1 text-gray-700"><div className="flex justify-between"><dt className="text-gray-500">Joined</dt><dd>{formatDate(customer.createdAt)}</dd></div><div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd>{customer.isBlocked ? "Blocked" : "Active"}</dd></div></dl></section><section className="rounded-xl border bg-white p-5 text-sm"><h2 className="mb-2 font-semibold">Saved addresses</h2>{addresses.length === 0 && <p className="text-gray-500">No saved addresses.</p>}<ul className="space-y-3">{addresses.map((a, i) => <li key={a._id || i} className="text-gray-700"><p className="font-medium">{a.fullName}</p><p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p><p>{[a.city, a.province, a.postalCode].filter(Boolean).join(", ")}</p>{a.phone && <p className="text-gray-500">{a.phone}</p>}</li>)}</ul></section></div></div>
      {dialog === "block" && <OrderActionDialog title={`Block ${customer.name}?`} description={`They will be signed out immediately and won't be able to log in or order with this account.${stats.openOrders > 0 ? ` They have ${stats.openOrders} open order${stats.openOrders === 1 ? "" : "s"}, which will NOT be cancelled automatically.` : " You can unblock them at any time."}`} confirmLabel="Block customer" danger noteLabel="Reason (kept in the audit log)" noteRequired onClose={() => setDialog(null)} onConfirm={(reason) => run(() => blockCustomer(id, reason), (r) => r.changed ? "Customer blocked" : "Customer was already blocked")} />}
      {dialog === "unblock" && <OrderActionDialog title={`Unblock ${customer.name}?`} description="They will be able to log in and place orders again." confirmLabel="Unblock customer" onClose={() => setDialog(null)} onConfirm={() => run(() => unblockCustomer(id), (r) => r.changed ? "Customer unblocked" : "Customer was not blocked")} />}
    </div>
  );
}
