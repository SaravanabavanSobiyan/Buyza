import { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { PageSkeleton } from "../components/common/Skeleton";
import ProtectedRoute, { AdminGuestRoute, GuestRoute } from "../components/ProtectedRoute";
import RequirePermission from "../components/admin/RequirePermission";
import Layout from "../components/Layout";
import NoIndexRoutes from "../components/seo/NoIndexRoutes";
import * as P from "./lazyPages";

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<P.Home />} />
          <Route path="/products" element={<P.Shop />} />
          <Route path="/products/:slug" element={<P.ProductDetail />} />
          <Route path="/category/:slug" element={<P.CategoryPage />} />
          <Route element={<NoIndexRoutes />}>
            <Route path="/cart" element={<P.Cart />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/checkout" element={<P.Checkout />} />
              <Route path="/checkout/payment" element={<P.PaymentPage />} />
              <Route path="/checkout/review" element={<P.ReviewPage />} />
              <Route path="/order-success" element={<P.OrderSuccessPage />} />
              <Route path="/orders" element={<P.OrdersPage />} />
              <Route path="/orders/:orderNumber" element={<P.OrderDetailPage />} />
              <Route path="/wishlist" element={<P.WishlistPage />} />
            </Route>
            <Route element={<GuestRoute />}>
              <Route path="/register" element={<P.Register />} />
              <Route path="/login" element={<P.Login />} />
              <Route path="/forgot-password" element={<P.ForgotPassword />} />
            </Route>
            <Route element={<AdminGuestRoute />}>
              <Route path="/admin/login" element={<P.Login adminOnly />} />
            </Route>
            <Route path="/reset-password/:token" element={<P.ResetPassword />} />
            <Route path="/oauth/callback" element={<P.OAuthCallback />} />
          </Route>
          <Route path="/contact" element={<P.ContactPage />} />
          <Route path="/about" element={<P.StaticPage pageKey="about" />} />
          <Route path="/shipping" element={<P.StaticPage pageKey="shipping" />} />
          <Route path="/returns" element={<P.StaticPage pageKey="returns" />} />
          <Route path="/terms" element={<P.StaticPage pageKey="terms" />} />
          <Route path="/privacy" element={<P.StaticPage pageKey="privacy" />} />
          <Route path="/faq" element={<P.FaqPage />} />
          <Route element={<NoIndexRoutes />}>
            <Route element={<ProtectedRoute />}>
              <Route path="/account" element={<P.AccountLayout />}>
                <Route index element={<P.Profile />} />
                <Route path="password" element={<P.ChangePassword />} />
                <Route path="addresses" element={<P.Addresses />} />
              </Route>
            </Route>
            <Route element={<RequirePermission permission="admin:access" />}>
              <Route path="/admin" element={<P.AdminLayout />}>
              <Route index element={<P.AdminIndex />} />
              <Route element={<RequirePermission permission="products:read" />}>
                <Route path="products" element={<P.Products />} />
              </Route>
              <Route element={<RequirePermission permission="orders:read" />}>
                <Route path="orders" element={<P.AdminOrdersPage />} />
                <Route path="orders/:orderNumber" element={<P.AdminOrderDetailPage />} />
              </Route>
              <Route element={<RequirePermission permission="products:write" />}>
                <Route path="products/new" element={<P.ProductForm />} />
                <Route path="products/:id/edit" element={<P.ProductForm />} />
                <Route path="categories" element={<P.Categories />} />
                <Route path="brands" element={<P.Brands />} />
              </Route>
              <Route element={<RequirePermission permission="customers:read" />}>
                <Route path="customers" element={<P.CustomersPage />} />
                <Route path="customers/:id" element={<P.CustomerDetailPage />} />
              </Route>
              <Route element={<RequirePermission permission="inventory:read" />}>
                <Route path="inventory" element={<P.Inventory />} />
              </Route>
              <Route element={<RequirePermission permission="staff:manage" />}>
                <Route path="staff" element={<P.StaffPage />} />
              </Route>
              <Route element={<RequirePermission permission="audit:read" />}>
                <Route path="audit-log" element={<P.AuditLogPage />} />
              </Route>
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<P.NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
