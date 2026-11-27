import { useCallback, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { logoutUser } from "../api/auth";
import { setUser } from "../store/authSlice";
import { openDrawer, resetCart } from "../store/cartSlice";
import { resetWishlist } from "../store/wishlistSlice";
import Avatar from "./Avatar";
import MobileMenu from "./MobileMenu";

export default function Navbar() {
  const user = useSelector((s) => s.auth.user);
  const cartCount = useSelector((s) => s.cart.cart.itemCount);
  const wishlistCount = useSelector((s) => s.wishlist.ids.length);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const isCatalogPage = location.pathname === "/products" || location.pathname.startsWith("/category/");
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // even if the request fails, clear the local session
    }
    dispatch(setUser(null));
    dispatch(resetCart());
    dispatch(resetWishlist());
    queryClient.clear();
    navigate("/");
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/products?search=${encodeURIComponent(trimmed)}` : "/products");
  };

  return (
    <header className="border-b border-[#e8e1cf] bg-[#fffdf8]">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-4 sm:py-3">
        <Link to="/" className="buyza-wordmark" aria-label="Buyza home">
          BUYZA
        </Link>

        {!location.pathname.startsWith("/admin") && (
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            className="tap inline-flex items-center justify-center rounded-full border border-[#e8e1d7] bg-white text-[#46382f] shadow-sm md:hidden"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {!location.pathname.startsWith("/admin") && location.pathname !== "/" && !isCatalogPage && (
          <form onSubmit={handleSearch} className="hidden flex-1 justify-center md:flex">
            <div className="flex w-full max-w-xl items-center gap-2 rounded-full border border-[#d9d0c4] bg-white px-3 py-2 shadow-sm">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products"
                className="w-full bg-transparent text-sm text-[#46382f] placeholder:text-[#8c817b] focus:outline-none"
                aria-label="Search products"
              />
              <button type="submit" className="rounded-full bg-[#46382f] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2e251f]">
                Search
              </button>
            </div>
          </form>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
          {!location.pathname.startsWith("/admin") && (
            <Link
              to="/wishlist"
              aria-label={`Wishlist${wishlistCount > 0 ? `, ${wishlistCount} items` : ""}`}
              className={`tap relative inline-flex shrink-0 items-center justify-center rounded-full border bg-white text-[#8b3a3a] shadow-sm transition hover:border-[#c9a96e] hover:bg-[#faf7f2] ${
                location.pathname === "/wishlist" ? "border-[#c9a96e] bg-[#faf7f2]" : "border-[#e8e1d7]"
              }`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
              </svg>
              {user && wishlistCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#fffdf8] bg-[#c9a96e] px-1 text-[10px] font-bold leading-none text-[#46382f]">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </Link>
          )}

          {!location.pathname.startsWith("/admin") && (
            <button
              type="button"
              onClick={() => dispatch(openDrawer())}
              aria-label={`Shopping cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
              className="tap relative inline-flex shrink-0 items-center justify-center rounded-full border border-[#e8e1d7] bg-white text-[#46382f] shadow-sm transition hover:border-[#c9a96e] hover:bg-[#faf7f2]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 1.9-1.5L21 8H6" />
                <circle cx="10" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#fffdf8] bg-[#c9a96e] px-1 text-[10px] font-bold leading-none text-[#46382f]">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>
          )}

          {!location.pathname.startsWith("/admin") && (
            <Link
              to="/contact"
              aria-label="Contact support"
              title="Contact support"
              className={`tap hidden shrink-0 items-center justify-center gap-2 rounded-full border bg-white px-3 text-sm font-medium text-[#46382f] shadow-sm transition hover:border-[#c9a96e] hover:bg-[#faf7f2] sm:inline-flex ${
                location.pathname === "/contact" ? "border-[#c9a96e] bg-[#faf7f2]" : "border-[#e8e1d7]"
              }`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
              </svg>
              <span className="hidden sm:inline">Contact</span>
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-4">
              {["staff", "manager", "admin"].includes(user.role) && (
                <Link to="/admin" className="tap-y hidden items-center text-sm font-medium text-blue-700 hover:underline lg:inline-flex">
                  Admin
                </Link>
              )}
              {!location.pathname.startsWith("/admin") && (
                <Link
                  to="/orders"
                  aria-label="My orders"
                  className={`tap hidden shrink-0 items-center justify-center gap-2 rounded-full border bg-white px-3 text-sm font-medium text-[#46382f] shadow-sm transition hover:border-[#c9a96e] hover:bg-[#faf7f2] sm:inline-flex ${
                    location.pathname.startsWith("/orders")
                      ? "border-[#c9a96e] bg-[#faf7f2]"
                      : "border-[#e8e1d7]"
                  }`}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-[18px] w-[18px] shrink-0"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
                    <path d="M15 3v5h5M9 13h8M9 17h5" />
                  </svg>
                  <span>My orders</span>
                </Link>
              )}
              <Link to="/account" className="tap flex items-center gap-2 text-sm text-[#6b665f] hover:text-[#46382f]">
                <Avatar user={user} size={28} />
                <span className="hidden sm:inline">{user.name}</span>
              </Link>
              <button onClick={handleLogout} className="tap hidden items-center text-sm text-[#6b665f] hover:text-[#46382f] sm:inline-flex">
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-sm sm:gap-4">
              <Link to="/login" className="tap hidden items-center text-[#6b665f] hover:text-[#46382f] sm:inline-flex">
                Log in
              </Link>
              <Link to="/register" className="buyza-primary hidden min-h-11 items-center rounded-lg px-3 py-1.5 sm:inline-flex">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </nav>
      <MobileMenu open={menuOpen} onClose={closeMenu} user={user} onLogout={handleLogout} />
    </header>
  );
}
