import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCategoryTree } from "../api/catalog";
import Sheet from "./common/Sheet";
import Alert from "./Alert";
import { getErrorMessage } from "../api/axios";

export default function MobileMenu({ open, onClose, user, onLogout }) {
  const [query, setQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const previousLocation = useRef(`${location.pathname}${location.search}`);
  const { data: categories = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["catalog", "categories"],
    queryFn: getCategoryTree,
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  useEffect(() => {
    const currentLocation = `${location.pathname}${location.search}`;
    if (currentLocation !== previousLocation.current) {
      previousLocation.current = currentLocation;
      onClose();
    }
  }, [location.pathname, location.search, onClose]);

  const submitSearch = (event) => {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/products?search=${encodeURIComponent(value)}` : "/products");
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Explore Buyza" side="left" className="max-w-sm">
      <form onSubmit={submitSearch} role="search" className="mb-5 flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search products"
          aria-label="Search products"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2"
        />
        <button type="submit" className="tap inline-flex items-center justify-center rounded-lg bg-[#46382f] px-4 font-medium text-white">Search</button>
      </form>

      <nav aria-label="Mobile navigation" className="space-y-1">
        <Link to="/products" onClick={onClose} className="tap-y flex w-full items-center rounded-lg px-3 font-medium hover:bg-gray-100">
          All products
        </Link>
        <h3 className="px-3 pt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Categories</h3>
        {isLoading && <p role="status" className="px-3 py-2 text-sm text-gray-500">Loading categories…</p>}
        {isError && (
          <div className="px-3">
            <Alert>{getErrorMessage(error)}</Alert>
            <button type="button" onClick={() => refetch()} className="tap-y inline-flex items-center text-sm text-blue-600 hover:underline">Retry categories</button>
          </div>
        )}
        {categories.map((category) => (
          <div key={category._id || category.slug}>
            <Link
              to={`/category/${encodeURIComponent(category.slug)}`}
              onClick={onClose}
              className="tap-y flex w-full items-center rounded-lg px-3 font-medium hover:bg-gray-100"
            >
              {category.name}
            </Link>
            {category.children?.map((child) => (
              <Link
                key={child._id || child.slug}
                to={`/category/${encodeURIComponent(child.slug)}`}
                onClick={onClose}
                className="tap-y flex w-full items-center rounded-lg pl-7 pr-3 text-sm text-gray-600 hover:bg-gray-100"
              >
                {child.name}
              </Link>
            ))}
          </div>
        ))}
        <Link to="/contact" onClick={onClose} className="tap-y flex w-full items-center rounded-lg px-3 hover:bg-gray-100">
          Contact support
        </Link>
        {user ? (
          <>
            <Link to="/account" onClick={onClose} className="tap-y flex w-full items-center rounded-lg px-3 hover:bg-gray-100">My account</Link>
            <Link to="/orders" onClick={onClose} className="tap-y flex w-full items-center rounded-lg px-3 hover:bg-gray-100">My orders</Link>
            {["staff", "manager", "admin"].includes(user.role) && (
              <Link to="/admin" onClick={onClose} className="tap-y flex w-full items-center rounded-lg px-3 hover:bg-gray-100">Admin</Link>
            )}
            <button type="button" onClick={onLogout} className="tap-y flex w-full items-center rounded-lg px-3 text-left hover:bg-gray-100">Log out</button>
          </>
        ) : (
          <>
            <Link to="/login" onClick={onClose} className="tap-y flex w-full items-center rounded-lg px-3 hover:bg-gray-100">Log in</Link>
            <Link to="/register" onClick={onClose} className="tap-y flex w-full items-center rounded-lg px-3 hover:bg-gray-100">Sign up</Link>
          </>
        )}
      </nav>
    </Sheet>
  );
}
