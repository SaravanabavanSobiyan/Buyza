import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import toast, { Toaster } from "react-hot-toast";
import { refreshSession } from "./api/axios";
import { setUser, setReady } from "./store/authSlice";
import { fetchAccess, resetAccess } from "./store/accessSlice";
import { fetchCart, mergeGuestCart, resetCart } from "./store/cartSlice";
import { fetchWishlistIds, resetWishlist } from "./store/wishlistSlice";
import { STAFF_ROLES } from "./utils/roles";
import { showErrorToast } from "./utils/showErrorToast";
import OfflineBanner from "./components/layout/OfflineBanner";
import AppRoutes from "./routes/AppRoutes";

// On page load, try to restore the session from the httpOnly refresh cookie
function AuthBootstrap({ children }) {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const ready = useSelector((s) => s.auth.ready);
  const userId = useSelector((s) => s.auth.user?.id || s.auth.user?._id);
  const role = useSelector((s) => s.auth.user?.role);

  useEffect(() => {
    refreshSession()
      .then((data) => dispatch(setUser(data.user)))
      .catch((error) => {
        if (error.response?.data?.code === "ACCOUNT_SUSPENDED") {
          window.location.replace("/login?suspended=1");
        }
      })
      .finally(() => dispatch(setReady()));

    // Fired by the Axios interceptor when a session can't be refreshed any more
    const onExpired = () => {
      dispatch(setUser(null));
      dispatch(resetCart());
      dispatch(resetWishlist());
      dispatch(resetAccess());
      queryClient.clear();
    };
    const onSuspended = () => {
      dispatch(setUser(null));
      dispatch(resetCart());
      dispatch(resetWishlist());
      dispatch(resetAccess());
      queryClient.clear();
      window.location.assign("/login?suspended=1");
    };
    window.addEventListener("auth:expired", onExpired);
    window.addEventListener("auth:suspended", onSuspended);
    return () => {
      window.removeEventListener("auth:expired", onExpired);
      window.removeEventListener("auth:suspended", onSuspended);
    };
  }, [dispatch, queryClient]);

  useEffect(() => {
    if (!ready) return;
    if (userId && STAFF_ROLES.includes(role)) dispatch(fetchAccess());
    else dispatch(resetAccess());
  }, [dispatch, ready, role, userId]);

  useEffect(() => {
    if (!ready) return;
    if (userId) {
      dispatch(fetchWishlistIds())
        .unwrap()
        .catch((message) =>
          showErrorToast(message, "Unable to load your wishlist.")
        );
      dispatch(mergeGuestCart())
        .unwrap()
        .then(({ notes }) => notes.forEach((note) => toast(note, { duration: 6000 })))
        .catch((message) => {
          showErrorToast(message, "Unable to merge your guest cart.");
          dispatch(fetchCart());
        });
    } else {
      dispatch(resetCart());
      dispatch(resetWishlist());
      dispatch(fetchCart());
    }
  }, [dispatch, ready, userId]);

  if (!ready) return <div className="p-10 text-center text-sm text-gray-500">Loading…</div>;
  return children;
}

export default function App() {
  return (
    <>
      <OfflineBanner />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          error: { duration: 6000 },
          style: { maxWidth: 420 },
        }}
      />
      <AuthBootstrap>
        <AppRoutes />
      </AuthBootstrap>
    </>
  );
}
