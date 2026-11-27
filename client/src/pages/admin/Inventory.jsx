import { useCallback, useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { getInventory, getStockAlerts } from "../../api/adminInventory";
import { getErrorMessage } from "../../api/axios";
import { formatAttributes } from "../../utils/format";
import { inputClass } from "../../components/FormField";
import Alert from "../../components/Alert";
import Button from "../../components/Button";
import AdjustStockModal from "./AdjustStockModal";
import InventoryHistoryModal from "./InventoryHistoryModal";

const statusLabel = {
  ok: "Healthy",
  low: "Low stock",
  out: "Out of stock",
};

function StatusBadge({ status }) {
  const map = {
    ok: "bg-emerald-50 text-emerald-700",
    low: "bg-amber-50 text-amber-700",
    out: "bg-red-50 text-red-700",
  };

  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[status] || map.ok}`}>{statusLabel[status] || status}</span>;
}

export default function Inventory() {
  const [params, setParams] = useSearchParams();
  const [selectedRow, setSelectedRow] = useState(null);
  const [historyRow, setHistoryRow] = useState(null);

  const page = Number(params.get("page")) || 1;
  const filters = {
    search: params.get("search") || "",
    status: params.get("status") || "all",
  };
  const [searchText, setSearchText] = useState(filters.search);

  const updateFilters = useCallback(
    (changes) => {
      const next = new URLSearchParams(params);
      next.delete("page");
      Object.entries(changes).forEach(([key, value]) => {
        if (value && value !== "all") next.set(key, value);
        else next.delete(key);
      });
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText !== filters.search) updateFilters({ search: searchText });
    }, 400);
    return () => clearTimeout(timer);
  }, [filters.search, searchText, updateFilters]);

  const query = Object.fromEntries(Object.entries(filters).filter(([, value]) => value && value !== "all"));
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["admin", "inventory", query, page],
    queryFn: () => getInventory({ ...query, page, limit: 15 }),
    placeholderData: keepPreviousData,
  });

  const { data: alerts = { low: 0, out: 0 }, isError: alertsError, error: alertsQueryError } = useQuery({
    queryKey: ["admin", "inventory", "alerts"],
    queryFn: getStockAlerts,
  });

  const rows = data?.rows || [];
  const pagination = data?.pagination;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium">Inventory</h2>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Low stock</p>
          <p className="mt-2 text-2xl font-semibold">{alerts.low}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs uppercase tracking-wide text-red-600">Out of stock</p>
          <p className="mt-2 text-2xl font-semibold text-red-700">{alerts.out}</p>
        </div>
      </div>
      {alertsError && <div className="mt-3"><Alert>{getErrorMessage(alertsQueryError)}</Alert></div>}

      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
        <input
          type="search"
          placeholder="Search by product or SKU"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          className={inputClass()}
          aria-label="Search inventory"
        />

        <select value={filters.status} onChange={(event) => updateFilters({ ...filters, status: event.target.value })} className={inputClass()}>
          <option value="all">All statuses</option>
          <option value="ok">Healthy</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
      </div>

      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-sm text-gray-500">Loading inventory…</p>}
        {isError && <Alert>{getErrorMessage(error)}</Alert>}

        {!isLoading && !isError && rows.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="font-medium">No stock items found</p>
            <p className="mt-1 text-sm text-gray-500">Try another search or stock filter.</p>
          </div>
        )}

        {rows.length > 0 && (
          <div className={`overflow-x-auto ${isFetching ? "opacity-60" : ""}`}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-gray-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Product</th>
                  <th className="py-2 pr-3 font-medium">SKU</th>
                  <th className="py-2 pr-3 font-medium">Stock</th>
                  <th className="py-2 pr-3 font-medium">Threshold</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.productId}-${row.sku}`} className="border-b border-gray-100">
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-3">
                        {row.image ? (
                          <img src={row.image} alt="" className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-gray-100" />
                        )}
                        <div>
                          <div className="font-medium">{row.name}</div>
                          {row.attributes && Object.keys(row.attributes).length > 0 && (
                            <div className="text-xs text-gray-500">{formatAttributes(row.attributes)}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-gray-600">{row.sku || "—"}</td>
                    <td className="py-2 pr-3 font-medium">{row.stock}</td>
                    <td className="py-2 pr-3 text-gray-600">{row.threshold}</td>
                    <td className="py-2 pr-3"><StatusBadge status={row.status} /></td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={() => setSelectedRow(row)}>
                          Adjust
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => setHistoryRow(row)}>
                          History
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.total > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              Page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={pagination.page <= 1}
                onClick={() => setParams(new URLSearchParams({ ...Object.fromEntries(params.entries()), page: pagination.page - 1 }))}
              >
                Prev
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setParams(new URLSearchParams({ ...Object.fromEntries(params.entries()), page: pagination.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {selectedRow && <AdjustStockModal row={selectedRow} onClose={() => setSelectedRow(null)} />}
      {historyRow && <InventoryHistoryModal row={historyRow} onClose={() => setHistoryRow(null)} />}
    </div>
  );
}
