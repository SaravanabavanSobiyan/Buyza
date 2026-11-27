import { Navigate } from "react-router-dom";
import usePermission from "../../hooks/usePermission";
import { ADMIN_NAV } from "../../config/adminNav";
import AdminDashboardPage from "./AdminDashboardPage";

export default function AdminIndex() {
  const can = usePermission();
  if (can("dashboard:read")) return <AdminDashboardPage />;

  const firstAllowed = ADMIN_NAV.find(
    (item) => item.to !== "/admin" && can(item.permission)
  );
  return <Navigate to={firstAllowed?.to || "/"} replace />;
}
