import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function NotFound({
  title = "Page not found",
  message = "The page you're looking for doesn't exist or may have moved.",
  showSearch = true,
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const search = (event) => {
    event.preventDefault();
    const term = query.trim();
    if (term) navigate(`/products?search=${encodeURIComponent(term)}`);
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <p className="text-7xl font-bold text-indigo-600" aria-hidden="true">404</p>
      <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-gray-600">{message}</p>
      {showSearch && (
        <form onSubmit={search} role="search" className="mt-6 flex w-full max-w-md gap-2">
          <label htmlFor="notfound-search" className="sr-only">Search products</label>
          <input
            id="notfound-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for a product"
            className="min-w-0 flex-1 rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
            Search
          </button>
        </form>
      )}
      <nav aria-label="Helpful links" className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
        <Link to="/" className="text-indigo-600 hover:underline">Home</Link>
        <Link to="/products" className="text-indigo-600 hover:underline">Browse products</Link>
        <Link to="/contact" className="text-indigo-600 hover:underline">Contact us</Link>
      </nav>
    </div>
  );
}
