import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import usePermission from "../../hooks/usePermission";
import { STAFF_ROLES } from "../../utils/roles";
import AccessDeniedPage from "../../pages/admin/AccessDeniedPage";

export default function RequirePermission({ permission = "admin:access" }) {
  const user = useSelector((state) => state.auth.user);
  const authReady = useSelector((state) => state.auth.ready);
  const loaded = useSelector((state) => state.access.loaded);
  const error = useSelector((state) => state.access.error);
  const can = usePermission();
  const location = useLocation();

  if (!authReady || (user && STAFF_ROLES.includes(user.role) && !loaded)) {
    return (
      <div className="mx-auto max-w-5xl animate-pulse px-4 py-10" aria-label="Loading permissions">
        <div className="mb-6 h-8 w-48 rounded bg-gray-200" />
        <div className="h-64 rounded-xl bg-gray-200" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!STAFF_ROLES.includes(user.role)) return <AccessDeniedPage />;
  if (error) return <AccessDeniedPage message={error} />;
  if (!can(permission)) return <AccessDeniedPage />;
  return <Outlet />;
}
