import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import api, { getErrorMessage } from "../../api/axios";
import Pagination from "../../components/Pagination";
import { formatDateTime } from "../../utils/format";
import { ROLE_LABELS } from "../../utils/roles";

export default function AuditLogPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") || 1);
  const action = params.get("action") || "";
  const from = params.get("from") || "";
  const to = params.get("to") || "";

  const actionsQuery = useQuery({
    queryKey: ["admin", "audit-log-actions"],
    queryFn: async () => (await api.get("/admin/audit-logs/actions")).data.actions,
  });
  const logsQuery = useQuery({
    queryKey: ["admin", "audit-logs", { page, action, from, to }],
    queryFn: async () => {
      const { data } = await api.get("/admin/audit-logs", {
        params: {
          page,
          limit: 25,
          action: action || undefined,
          from: from || undefined,
          to: to || undefined,
        },
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next);
  };

  const goToPage = (nextPage) => {
    const next = new URLSearchParams(params);
    if (nextPage > 1) next.set("page", String(nextPage));
    else next.delete("page");
    setParams(next);
  };

  const hasFilters = Boolean(action || from || to);
  const data = logsQuery.data;

  return (
    <div>
      <h2 className="text-lg font-semibold">Audit log</h2>
      <p className="mb-6 mt-1 text-sm text-gray-600">
        A record of important staff and order actions. Entries are not editable.
      </p>

      <div className="mb-6 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Action</span>
          <select
            value={action}
            onChange={(event) => setFilter("action", event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">All actions</option>
            {(actionsQuery.data || []).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          {actionsQuery.isError && (
            <span className="mt-1 block text-xs text-red-700">{getErrorMessage(actionsQuery.error, "Could not load audit actions.")}</span>
          )}
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">From</span>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => setFilter("from", event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">To</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => setFilter("to", event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>
        <div className="flex items-end">
          {hasFilters && (
            <button type="button" onClick={() => setParams({})} className="text-sm text-indigo-600 hover:underline">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {logsQuery.isError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getErrorMessage(logsQuery.error, "Could not load the audit log.")}{" "}
          <button type="button" onClick={() => logsQuery.refetch()} className="font-medium underline">Try again</button>
        </div>
      )}
      {logsQuery.isLoading && <div className="h-48 animate-pulse rounded-xl bg-gray-100" />}
      {data && data.logs.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-gray-600">
          {hasFilters ? "No entries match these filters." : "Nothing has been logged yet."}
        </div>
      )}
      {data && data.logs.length > 0 && (
        <div className={`overflow-x-auto rounded-xl border border-gray-200 bg-white ${logsQuery.isFetching ? "opacity-60" : ""}`}>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.logs.map((log) => (
                <tr key={log._id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3">
                    {log.actor ? (
                      <>
                        <span className="font-medium">{log.actor.name}</span>
                        <span className="block text-xs text-gray-500">{ROLE_LABELS[log.actorRole] || log.actorRole}</span>
                      </>
                    ) : <span className="text-gray-400">Deleted user</span>}
                  </td>
                  <td className="px-4 py-3"><code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{log.action}</code></td>
                  <td className="px-4 py-3">
                    {log.summary}
                    {log.meta?.note && <span className="block text-xs text-gray-500">Note: {log.meta.note}</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-400">{log.ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.totalPages} onChange={goToPage} />}
    </div>
  );
}
