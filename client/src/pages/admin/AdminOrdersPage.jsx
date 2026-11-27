import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { fetchAdminOrders } from "../../api/adminOrders";
import StatusBadge from "../../components/orders/StatusBadge";
import PaymentBadge from "../../components/orders/PaymentBadge";
import Pagination from "../../components/Pagination";
import useDebounce from "../../hooks/useDebounce";
import { formatMoney } from "../../utils/money";
import { formatDateTime } from "../../utils/format";

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];
const STATUS_LABEL = { pending: "Pending", processing: "Processing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") || 1);
  const status = params.get("status") || "";
  const paymentStatus = params.get("paymentStatus") || "";
  const paymentMethod = params.get("paymentMethod") || "";
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const sort = params.get("sort") || "newest";
  const q = params.get("q") || "";
  const [search, setSearch] = useState(q);
  const debounced = useDebounce(search, 400);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const setFilter = useCallback((key, value) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    }, { replace: key === "q" });
  }, [setParams]);

  useEffect(() => {
    if (debounced.trim() !== q) setFilter("q", debounced.trim());
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setSearch(q), [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchAdminOrders({
        page, limit: 20,
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
        paymentMethod: paymentMethod || undefined,
        from: from || undefined,
        to: to || undefined,
        q: q || undefined,
        sort,
      }));
    } catch (e) {
      setError(e.response?.data?.message || "Could not load orders");
    } finally {
      setLoading(false);
    }
  }, [page, status, paymentStatus, paymentMethod, from, to, q, sort]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  const hasFilters = status || paymentStatus || paymentMethod || from || to || q;
  const allCount = data ? Object.values(data.counts).reduce((sum, count) => sum + count, 0) : null;

  const tab = (value, label, count) => (
    <button key={value || "all"} onClick={() => setFilter("status", value)} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${status === value ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
      {label}{count != null && <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{count}</span>}
    </button>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Orders</h1>
      <div className="mb-4 flex gap-1 overflow-x-auto border-b">
        {tab("", "All", allCount)}
        {STATUSES.map((item) => tab(item, STATUS_LABEL[item], data?.counts[item]))}
      </div>
      <div className="mb-6 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
        <label className="text-sm lg:col-span-2">
          <span className="mb-1 block font-medium">Search</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order number, name, email or phone" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <label className="text-sm"><span className="mb-1 block font-medium">Payment</span>
          <select value={paymentStatus} onChange={(event) => setFilter("paymentStatus", event.target.value)} className="w-full rounded-lg border px-3 py-2">
            <option value="">Any</option><option value="pending">Unpaid</option><option value="paid">Paid</option><option value="failed">Failed</option><option value="refund_pending">Refund due</option><option value="refunded">Refunded</option>
          </select>
        </label>
        <label className="text-sm"><span className="mb-1 block font-medium">Method</span>
          <select value={paymentMethod} onChange={(event) => setFilter("paymentMethod", event.target.value)} className="w-full rounded-lg border px-3 py-2">
            <option value="">Any</option><option value="cod">Cash on delivery</option><option value="card">Card</option>
          </select>
        </label>
        <label className="text-sm"><span className="mb-1 block font-medium">From</span><input type="date" value={from} max={to || undefined} onChange={(event) => setFilter("from", event.target.value)} className="w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm"><span className="mb-1 block font-medium">To</span><input type="date" value={to} min={from || undefined} onChange={(event) => setFilter("to", event.target.value)} className="w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm"><span className="mb-1 block font-medium">Sort by</span>
          <select value={sort} onChange={(event) => setFilter("sort", event.target.value === "newest" ? "" : event.target.value)} className="w-full rounded-lg border px-3 py-2">
            <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="total_high">Total: high to low</option><option value="total_low">Total: low to high</option>
          </select>
        </label>
        <div className="flex items-end">{hasFilters && <button onClick={() => setParams({})} className="text-sm text-indigo-600 hover:underline">Clear filters</button>}</div>
      </div>
      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button onClick={load} className="font-medium underline">Try again</button></div>}
      {loading && !data && <div className="h-72 animate-pulse rounded-xl bg-gray-200" />}
      {data && data.orders.length === 0 && <div className="rounded-xl border bg-white py-16 text-center text-gray-600">{hasFilters ? "No orders match these filters." : "No orders yet."}</div>}
      {data && data.orders.length > 0 && (
        <div className={`overflow-x-auto rounded-xl border bg-white ${loading ? "opacity-60" : ""}`}>
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3 text-right">Items</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y">{data.orders.map((order) => (
              <tr key={order._id} onClick={() => navigate(`/admin/orders/${order.orderNumber}`)} className="cursor-pointer hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 font-medium"><Link to={`/admin/orders/${order.orderNumber}`} onClick={(event) => event.stopPropagation()} className="text-indigo-600 hover:underline">{order.orderNumber}</Link></td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDateTime(order.createdAt)}</td>
                <td className="px-4 py-3"><span className="font-medium">{order.customerName}</span>{order.isGuest && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">Guest</span>}<span className="block text-xs text-gray-500">{order.email}</span></td>
                <td className="px-4 py-3 text-right">{order.itemCount}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{formatMoney(order.total)}</td>
                <td className="px-4 py-3"><PaymentBadge status={order.payment.status} /><span className="mt-1 block text-xs text-gray-500">{order.payment.method === "cod" ? "Cash on delivery" : "Card"}</span></td>
                <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {data && <div className="mt-2 text-center text-xs text-gray-500">{data.total} order{data.total === 1 ? "" : "s"}</div>}
      {data && <Pagination page={data.page} pages={data.totalPages} onChange={(nextPage) => setFilter("page", String(nextPage))} />}
    </div>
  );
}
