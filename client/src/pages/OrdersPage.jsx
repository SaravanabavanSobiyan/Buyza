import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchOrders } from "../api/orders";
import Pagination from "../components/Pagination";
import StatusBadge from "../components/orders/StatusBadge";
import { formatDate } from "../utils/format";
import { formatMoney } from "../utils/money";

const STATUS_OPTIONS = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export default function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") || 1);
  const status = params.get("status") || "";
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const queryKey = JSON.stringify([page, status, from, to]);
  const [request, setRequest] = useState({
    key: null,
    data: null,
    error: "",
    loading: true,
  });
  const isCurrentRequest = request.key === queryKey;
  const data = isCurrentRequest ? request.data : null;
  const error = isCurrentRequest ? request.error : "";
  const loading = !isCurrentRequest || request.loading;

  const load = useCallback(async () => {
    try {
      const response = await fetchOrders({
        page,
        limit: 10,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setRequest({ key: queryKey, data: response, error: "", loading: false });
    } catch (requestError) {
      setRequest({
        key: queryKey,
        data: null,
        error:
          requestError.response?.data?.message || "Could not load your orders",
        loading: false,
      });
    }
  }, [page, status, from, to, queryKey]);

  useEffect(() => {
    let active = true;
    fetchOrders({
      page,
      limit: 10,
      status: status || undefined,
      from: from || undefined,
      to: to || undefined,
    })
      .then((response) => {
        if (active) {
          setRequest({ key: queryKey, data: response, error: "", loading: false });
        }
      })
      .catch((requestError) => {
        if (active) {
          setRequest({
            key: queryKey,
            data: null,
            error:
              requestError.response?.data?.message || "Could not load your orders",
            loading: false,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [page, status, from, to, queryKey]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next);
  };

  const setPage = (nextPage) => {
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage));
    setParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasFilters = Boolean(status || from || to);
  const totalOrders = data?.total ?? 0;
  const visibleOrders = data?.orders.length ?? 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <header className="mb-8 overflow-hidden rounded-2xl bg-[#46382f] text-white shadow-lg shadow-[#46382f]/10">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#e2c68f]">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-7 w-7"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
                <path d="M15 3v5h5M9 13h8M9 17h8" />
              </svg>
            </div>
            <div>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">My orders</h1>
            </div>
          </div>
          {data && (
            <div className="w-fit rounded-xl border border-white/15 bg-white/10 px-4 py-3">
              <p className="text-2xl font-bold">{totalOrders}</p>
              <p className="text-xs text-white/70">
                {totalOrders === 1 ? "order found" : "orders found"}
              </p>
            </div>
          )}
        </div>
        <div className="h-1 bg-gradient-to-r from-[#c9a96e] via-[#e2c68f] to-transparent" />
      </header>

      <section
        aria-label="Filter orders"
        className="mb-6 rounded-2xl border border-[#e8e1d7] bg-white p-4 shadow-sm sm:p-5"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-[#46382f]">Find an order</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Filter by order status or purchase date.
            </p>
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={() => setParams(new URLSearchParams())}
              className="rounded-lg px-3 py-2 text-sm font-medium text-[#765b35] hover:bg-[#faf7f2]"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Status
            </span>
            <select
              value={status}
              onChange={(event) => setFilter("status", event.target.value)}
              className="w-full rounded-xl border border-[#e8e1d7] bg-[#fffdf8] px-3 py-2.5 text-sm text-[#46382f] outline-none transition focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              From
            </span>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => setFilter("from", event.target.value)}
              className="w-full rounded-xl border border-[#e8e1d7] bg-[#fffdf8] px-3 py-2.5 text-sm text-[#46382f] outline-none transition focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              To
            </span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setFilter("to", event.target.value)}
              className="w-full rounded-xl border border-[#e8e1d7] bg-[#fffdf8] px-3 py-2.5 text-sm text-[#46382f] outline-none transition focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20"
            />
          </label>
        </div>
      </section>

      {error && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <button onClick={load} className="mt-2 font-medium underline">
            Try again
          </button>
        </div>
      )}

      {loading && !data && (
        <div className="space-y-4" aria-label="Loading orders">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-2xl border border-[#e8e1d7] bg-white p-5"
            >
              <div className="mb-5 flex justify-between gap-4">
                <div className="space-y-2">
                  <div className="h-3 w-24 rounded bg-gray-200" />
                  <div className="h-5 w-40 rounded bg-gray-200" />
                </div>
                <div className="h-7 w-24 rounded-full bg-gray-200" />
              </div>
              <div className="flex gap-4 border-t border-gray-100 pt-4">
                <div className="h-20 w-20 rounded-xl bg-gray-200" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 w-2/3 rounded bg-gray-200" />
                  <div className="h-3 w-1/3 rounded bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.orders.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#d9d0c4] bg-white px-6 py-14 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#faf7f2] text-[#9a7946]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="h-8 w-8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3h2l2.2 11.1a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 1.9-1.5L21 8H6" />
              <circle cx="10" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-[#46382f]">
            {hasFilters ? "No matching orders" : "Your order list is waiting"}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
            {hasFilters
              ? "Try changing the status or date range to find what you’re looking for."
              : "Once you place an order, you can follow its progress and find all the details here."}
          </p>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => setParams(new URLSearchParams())}
              className="mt-5 rounded-xl border border-[#d9d0c4] px-5 py-2.5 text-sm font-semibold text-[#46382f] hover:bg-[#faf7f2]"
            >
              Clear filters
            </button>
          ) : (
            <Link
              to="/products"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#46382f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2e251f]"
            >
              Explore products <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      )}

      {data && data.orders.length > 0 && (
        <>
          <div className="mb-3 flex items-center justify-between text-sm text-gray-500">
            <p>
              Showing {visibleOrders} of {totalOrders}{" "}
              {totalOrders === 1 ? "order" : "orders"}
            </p>
            {loading && <span className="animate-pulse">Updating...</span>}
          </div>
          <ul className={`space-y-4 ${loading ? "opacity-60" : ""}`}>
            {data.orders.map((order) => (
              <li key={order._id}>
                <Link
                  to={`/orders/${order.orderNumber}`}
                  className="group block overflow-hidden rounded-2xl border border-[#e8e1d7] bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#c9a96e] hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a7946]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0ece5] bg-[#fffdf8] px-4 py-4 sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#46382f] text-[#e2c68f]">
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          fill="none"
                          className="h-5 w-5"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
                          <path d="M15 3v5h5M9 13h8M9 17h5" />
                        </svg>
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Order number
                        </p>
                        <p className="truncate font-bold text-[#46382f]">
                          {order.orderNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={order.status} />
                      <span
                        className="hidden text-gray-300 sm:inline"
                        aria-hidden="true"
                      >
                        •
                      </span>
                      <span className="hidden text-sm text-gray-500 sm:inline">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#eee8de] bg-[#faf7f2] sm:h-24 sm:w-24">
                        {order.preview[0]?.image ? (
                          <img
                            src={order.preview[0].image}
                            alt={order.preview[0].name}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            className="h-9 w-9 text-[#b8aa96]"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m4 7 8-4 8 4v10l-8 4-8-4V7Z" />
                            <path d="m4 7 8 4 8-4M12 21V11" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {order.preview[0] && (
                          <p className="truncate font-semibold text-[#46382f]">
                            {order.preview[0].name}
                          </p>
                        )}
                        {order.preview[0]?.variantSku && (
                          <p className="mt-0.5 text-xs text-gray-500">
                            Variant: {order.preview[0].variantSku}
                          </p>
                        )}
                        <p className="mt-1 text-sm text-gray-500">
                          Qty {order.preview[0]?.quantity ?? order.itemCount}
                        </p>
                        {order.lineCount > 1 && (
                          <p className="mt-1 text-xs font-medium text-[#80643d]">
                            {order.lineCount - 1} more{" "}
                            {order.lineCount === 2 ? "item" : "items"} in this
                            order
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-400 sm:hidden">
                          Placed {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-dashed border-[#e8e1d7] pt-3 sm:min-w-44 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                      <div className="sm:text-right">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Order total
                        </p>
                        <p className="mt-0.5 text-xl font-bold text-[#46382f]">
                          {formatMoney(order.total)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.itemCount} unit
                          {order.itemCount === 1 ? "" : "s"} ·{" "}
                          {order.payment.method === "cod"
                            ? "Cash on delivery"
                            : order.payment.method}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#87673b] transition group-hover:gap-2 sm:mt-3">
                        View details <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {data && data.orders.length > 0 && (
        <Pagination
          page={data.page}
          pages={data.totalPages}
          onChange={setPage}
        />
      )}
    </main>
  );
}
