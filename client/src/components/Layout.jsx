import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MiniCartDrawer from "./cart/MiniCartDrawer";
import RouteErrorBoundary from "./common/RouteErrorBoundary";
import ScrollToTop from "./layout/ScrollToTop";

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-[#faf7f2] text-[#46382f]">
      <ScrollToTop />
      <Navbar />
      <div className="flex-1">
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </div>
      <Footer />
      <MiniCartDrawer />
    </div>
  );
}
