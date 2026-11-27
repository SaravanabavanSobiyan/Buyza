import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../api/axios";
import { ROLE_LABELS } from "../../utils/roles";
import { showErrorToast } from "../../utils/showErrorToast";

const ASSIGNABLE = ["staff", "manager", "admin"];
const userId = (user) => user?._id || user?.id;

export default function StaffPage() {
  const me = useSelector((state) => state.auth.user);
  const queryClient = useQueryClient();
  const [workingId, setWorkingId] = useState(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [pickRole, setPickRole] = useState({});

  const staffQuery = useQuery({
    queryKey: ["admin", "staff"],
    queryFn: async () => (await api.get("/admin/staff")).data.staff,
  });
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const normalizedSearch = debouncedQuery.trim();
  const usersQuery = useQuery({
    queryKey: ["admin", "users", normalizedSearch],
    queryFn: async () =>
      (await api.get("/admin/users", { params: { q: normalizedSearch } })).data.users,
    enabled: normalizedSearch.length >= 2,
  });

  const setRole = async (user, role) => {
    const removing = role === "customer";
    const confirmed = window.confirm(
      removing
        ? `Remove all admin access from ${user.email}?`
        : `Change ${user.email} to ${ROLE_LABELS[role]}?`
    );
    if (!confirmed) return;

    setWorkingId(userId(user));
    try {
      await api.patch(`/admin/users/${userId(user)}/role`, { role });
      toast.success("Role updated");
      setQuery("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "staff"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
      ]);
    } catch (error) {
      showErrorToast(error, "Could not change the role.");
    } finally {
      setWorkingId(null);
    }
  };

  const setBlocked = async (user) => {
    const isBlocked = !user.isBlocked;
    const action = isBlocked ? "Suspend" : "Reactivate";
    if (!window.confirm(`${action} ${user.email}?`)) return;

    setWorkingId(userId(user));
    try {
      await api.patch(`/admin/users/${userId(user)}/block`, {
        isBlocked,
        reason: isBlocked ? "Suspended by an administrator" : "",
      });
      toast.success(isBlocked ? "Account suspended" : "Account reactivated");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "staff"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
      ]);
    } catch (error) {
      showErrorToast(error, "Could not update the account status.");
    } finally {
      setWorkingId(null);
    }
  };

  const renderUserActions = (user) => {
    const isMe = userId(user) === userId(me);
    return (
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={user.role}
          disabled={isMe || workingId === userId(user)}
          onChange={(event) => setRole(user, event.target.value)}
          aria-label={`Role of ${user.name}`}
          title={isMe ? "You can't change your own role" : undefined}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-60"
        >
          {user.role === "customer" && <option value="customer">Customer</option>}
          {ASSIGNABLE.map((role) => (
            <option key={role} value={role}>{ROLE_LABELS[role]}</option>
          ))}
        </select>
        {!isMe && (
          <button
            type="button"
            onClick={() => setBlocked(user)}
            disabled={workingId === userId(user)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
              user.isBlocked
                ? "border border-green-200 text-green-700 hover:bg-green-50"
                : "border border-red-200 text-red-700 hover:bg-red-50"
            }`}
          >
            {user.isBlocked ? "Reactivate" : "Suspend"}
          </button>
        )}
      </div>
    );
  };

  const searchResults = (usersQuery.data || []).filter((user) => user.role === "customer");

  return (
    <div>
      <h2 className="text-lg font-semibold">Staff &amp; roles</h2>
      <p className="mb-6 mt-1 text-sm leading-6 text-gray-600">
        Staff can process orders and update inventory. Managers can also manage products and customers. Admins have full access.
      </p>

      {staffQuery.isError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getErrorMessage(staffQuery.error, "Could not load the team.")}{" "}
          <button type="button" onClick={() => staffQuery.refetch()} className="font-medium underline">Try again</button>
        </div>
      )}

      <section className="mb-8 rounded-xl border border-gray-200">
        <h3 className="border-b border-gray-200 px-4 py-3 font-semibold">Team</h3>
        {staffQuery.isLoading && <div className="m-4 h-24 animate-pulse rounded bg-gray-100" />}
        {staffQuery.data?.length === 0 && <p className="p-4 text-sm text-gray-500">No team members yet.</p>}
        {staffQuery.data?.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {staffQuery.data.map((user) => (
              <li key={user._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {user.name} {userId(user) === userId(me) && <span className="text-xs font-normal text-gray-400">(you)</span>}
                    {user.isBlocked && <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Suspended</span>}
                  </p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                {renderUserActions(user)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold">Find an account</h3>
        <p className="mb-3 mt-1 text-sm text-gray-500">
          Search for an existing customer account, choose a team role, then assign it.
        </p>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name or email..."
          aria-label="Search users by name or email"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {usersQuery.isFetching && normalizedSearch.length >= 2 && (
          <p className="mt-3 text-sm text-gray-500">Searching…</p>
        )}
        {usersQuery.isError && (
          <p role="alert" className="mt-3 text-sm text-red-700">{getErrorMessage(usersQuery.error, "Could not search accounts.")}</p>
        )}
        {!usersQuery.isFetching && normalizedSearch.length >= 2 && searchResults.length === 0 && !usersQuery.isError && (
          <p className="mt-3 text-sm text-gray-500">No matching customer accounts. Only customers can be added to the team.</p>
        )}
        {searchResults.length > 0 && (
          <ul className="mt-3 divide-y divide-gray-100">
            {searchResults.map((user) => (
              <li key={user._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">
                    {user.name}
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-600">Customer</span>
                    {user.isBlocked && <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Suspended</span>}
                  </p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={pickRole[user._id] || "staff"}
                    onChange={(event) => setPickRole((current) => ({ ...current, [user._id]: event.target.value }))}
                    disabled={user.isBlocked || workingId === user._id}
                    aria-label={`Assign role to ${user.name}`}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-60"
                  >
                    {ASSIGNABLE.map((role) => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setRole(user, pickRole[user._id] || "staff")}
                    disabled={user.isBlocked || workingId === user._id}
                    title={user.isBlocked ? "Reactivate this customer before assigning a team role" : undefined}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Assign
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
