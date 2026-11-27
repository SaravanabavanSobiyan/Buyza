import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getStockHistory } from "../../api/adminInventory";
import { getErrorMessage } from "../../api/axios";
import { formatDateTime } from "../../utils/format";
import Alert from "../../components/Alert";
import Button from "../../components/Button";
import Modal from "../../components/Modal";

export default function InventoryHistoryModal({ row, onClose }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["admin", "inventory", "history", row.productId, row.sku, page],
    queryFn: () => getStockHistory({ productId: row.productId, sku: row.sku, page, limit: 10 }),
    placeholderData: keepPreviousData,
  });

  const movements = data?.movements || [];
  const pagination = data?.pagination;

  return (
    <Modal title={`Stock history: ${row.name}`} onClose={onClose} wide>
      <p className="mb-3 text-sm text-gray-500">SKU {row.sku || "—"}</p>
      {isLoading && <p className="text-sm text-gray-500">Loading history…</p>}
      {isError && <Alert>{getErrorMessage(error)}</Alert>}
      {!isLoading && !isError && movements.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          No stock history recorded for this item.
        </p>
      )}
      {movements.length > 0 && (
        <div className={`overflow-x-auto ${isFetching ? "opacity-60" : ""}`}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-gray-500">
              <tr>
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Change</th>
                <th className="py-2 pr-3 font-medium">Reason</th>
                <th className="py-2 pr-3 font-medium">Note</th>
                <th className="py-2 font-medium">Admin</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={movement._id} className="border-b border-gray-100">
                  <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(movement.createdAt)}</td>
                  <td className={`py-2 pr-3 font-medium ${movement.change > 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {movement.change > 0 ? "+" : ""}{movement.change}
                  </td>
                  <td className="py-2 pr-3 capitalize">{movement.reason}</td>
                  <td className="py-2 pr-3">{movement.note || "—"}</td>
                  <td className="py-2">{movement.user?.name || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pagination && pagination.pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>Page {pagination.page} of {pagination.pages}</span>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              Prev
            </Button>
            <Button type="button" variant="secondary" disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}
