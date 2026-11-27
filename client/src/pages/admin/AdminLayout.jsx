import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getStockAlerts } from "../../api/adminInventory";
import { ADMIN_NAV } from "../../config/adminNav";
import usePermission from "../../hooks/usePermission";

export default function AdminLayout() {
  const can = usePermission();
  const { data: alerts } = useQuery({
    queryKey: ["admin", "inventory", "alerts"],
    queryFn: getStockAlerts,
  });
  const links = ADMIN_NAV.filter((item) => can(item.permission)).map((item) => ({
    ...item,
    alertCount: item.to === "/admin/inventory" ? (alerts?.low || 0) + (alerts?.out || 0) : 0,
  }));

  return (
    <main className="mx-auto max-w-6xl px-2 py-6 sm:px-4 sm:py-8">
      <h1 className="mb-6 text-2xl font-semibold">Admin</h1>
      <div className="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="flex max-w-full gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex-shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm ${isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}`
              }
            >
              {l.label}
              {l.alertCount > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800" aria-label={`${l.alertCount} low or out of stock items`}>
                  {l.alertCount}
                </span>
              )}
            </NavLink>
          ))}
        </aside>
        <section className="admin-content min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5 lg:p-6">
          <Outlet />
        </section>
      </div>
    </main>
  );
}
