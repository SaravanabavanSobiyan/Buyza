import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { fetchCustomers } from "../../api/adminCustomers";
import Pagination from "../../components/Pagination";
import useDebounce from "../../hooks/useDebounce";
import { formatDate } from "../../utils/format";
import { formatMoney } from "../../utils/money";

export default function CustomersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") || 1);
  const status = params.get("status") || "";
  const sort = params.get("sort") || "newest";
  const q = params.get("q") || "";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(q);
  const debounced = useDebounce(search, 400);

  const setFilter = useCallback((key, value) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
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
      setData(await fetchCustomers({ page, limit: 20, status: status || undefined, sort, q: q || undefined }));
    } catch (e) {
      setError(e.response?.data?.message || "Could not load customers");
    } finally {
      setLoading(false);
    }
  }, [page, status, sort, q]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const hasFilters = status || q || sort !== "newest";
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Customers</h1>
      <div className="mb-4 flex gap-1 border-b">
        {[["", "All"], ["active", "Active"], ["blocked", "Blocked"]].map(([value, label]) => (
          <button key={label} onClick={() => setFilter("status", value)} className={`border-b-2 px-3 py-2 text-sm font-medium ${status === value ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500"}`}>{label}</button>
        ))}
      </div>
      <div className="mb-6 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-3">
        <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium">Search</span><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or email" className="w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm"><span className="mb-1 block font-medium">Sort by</span>
          <select value={sort} onChange={(e) => setFilter("sort", e.target.value === "newest" ? "" : e.target.value)} className="w-full rounded-lg border px-3 py-2">
            <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="spent">Most spent</option><option value="orders">Most orders</option><option value="name">Name (A to Z)</option>
          </select>
        </label>
        {hasFilters && <div className="sm:col-span-3"><button onClick={() => setParams({})} className="text-sm text-indigo-600 hover:underline">Clear filters</button></div>}
      </div>
      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button onClick={load} className="font-medium underline">Try again</button></div>}
      {loading && !data && <div className="h-72 animate-pulse rounded-xl bg-gray-200" />}
      {data && data.customers.length === 0 && <div className="rounded-xl border bg-white py-16 text-center text-gray-600">{hasFilters ? "No customers match these filters." : "No customers yet."}</div>}
      {data && data.customers.length > 0 && (
        <div className={`overflow-x-auto rounded-xl border bg-white ${loading ? "opacity-60" : ""}`}>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3 text-right">Orders</th><th className="px-4 py-3 text-right">Total spent</th><th className="px-4 py-3">Last order</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y">
              {data.customers.map((c) => (
                <tr key={c._id} onClick={() => navigate(`/admin/customers/${c._id}`)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-4 py-3"><Link to={`/admin/customers/${c._id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-indigo-600 hover:underline">{c.name}</Link><span className="block text-xs text-gray-500">{c.email}</span></td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-3 text-right">{c.ordersCount}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{formatMoney(c.totalSpent)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{c.lastOrderAt ? formatDate(c.lastOrderAt) : "-"}</td>
                  <td className="px-4 py-3">{c.isBlocked ? <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Blocked</span> : <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">Active</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <div className="mt-2 text-center text-xs text-gray-500">{data.total} customer{data.total === 1 ? "" : "s"}</div>}
      {data && <Pagination page={data.page} pages={data.totalPages} onChange={(p) => setFilter("page", String(p))} />}
    </div>
  );
}
