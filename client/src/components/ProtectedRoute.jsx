import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

// Guests get sent to /login, then back to where they were going
export default function ProtectedRoute({ roles }) {
  const user = useSelector((s) => s.auth.user);
  const location = useLocation();

  if (!user) {
    const loginPath = roles?.includes("admin") || roles?.includes("manager") ? "/admin/login" : "/login";
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

// Login/register pages: logged-in users are sent away
export function GuestRoute() {
  const user = useSelector((s) => s.auth.user);
  const location = useLocation();

  if (user) {
    const from = location.state?.from;
    return <Navigate to={from ? { pathname: from.pathname, search: from.search, hash: from.hash } : "/"} replace />;
  }
  return <Outlet />;
}

export function AdminGuestRoute() {
  const user = useSelector((s) => s.auth.user);
  const location = useLocation();

  if (user && ["staff", "manager", "admin"].includes(user.role)) {
    const from = location.state?.from;
    return <Navigate to={from ? { pathname: from.pathname, search: from.search, hash: from.hash } : "/admin"} replace />;
  }
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
