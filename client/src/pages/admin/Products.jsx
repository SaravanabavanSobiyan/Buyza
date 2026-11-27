import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminProducts, deleteProduct } from "../../api/adminProducts";
import { getAdminCategories, getAdminBrands } from "../../api/admin";
import { getErrorMessage } from "../../api/axios";
import { formatMoney } from "../../utils/money";
import { inputClass } from "../../components/FormField";
import Alert from "../../components/Alert";
import usePermission from "../../hooks/usePermission";

function StockBadge({ product }) {
  if (product.stock === 0) return <span className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700">Out of stock</span>;
  const lowVariantStock = product.variants
    ?.map((variant) => variant.stock)
    .filter((stock) => stock > 0 && stock <= product.lowStockThreshold)
    .sort((a, b) => a - b)[0];
  if (product.stock <= product.lowStockThreshold || lowVariantStock !== undefined)
    return <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Low: {lowVariantStock ?? product.stock}</span>;
  return <span>{product.stock}</span>;
}

export default function Products() {
  const can = usePermission();
  const canWrite = can("products:write");
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState("");

  const page = Number(params.get("page")) || 1;
  const filters = {
    category: params.get("category") || "",
    brand: params.get("brand") || "",
    status: params.get("status") || "all",
    stock: params.get("stock") || "all",
  };

  const update = (changes) => {
    const next = new URLSearchParams(params);
    next.delete("page");
    Object.entries(changes).forEach(([k, v]) => (v && v !== "all" ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const goToPage = (p) => {
    const next = new URLSearchParams(params);
    if (p > 1) next.set("page", p);
    else next.delete("page");
    setParams(next);
  };

  const query = Object.fromEntries(Object.entries(filters).filter(([, v]) => v && v !== "all"));
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["admin", "products", query, page],
    queryFn: () => getAdminProducts({ ...query, page, limit: 10 }),
    placeholderData: keepPreviousData,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: getAdminCategories,
    enabled: canWrite,
  });
  const { data: brands = [] } = useQuery({
    queryKey: ["admin", "brands"],
    queryFn: getAdminBrands,
    enabled: canWrite,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const handleDelete = (product) => {
    setActionError("");
    if (window.confirm(`Delete "${product.name}"? It will be removed from the store.`)) {
      deleteMutation.mutate(product._id);
    }
  };

  const products = data?.products || [];
  const pagination = data?.pagination;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Products</h2>
        {canWrite && (
          <Link to="/admin/products/new" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
            Add product
          </Link>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <select value={filters.category} onChange={(e) => update({ ...filters, category: e.target.value })} className={inputClass()} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.parent ? "— " : ""}
              {c.name}
            </option>
          ))}
        </select>
        <select value={filters.brand} onChange={(e) => update({ ...filters, brand: e.target.value })} className={inputClass()} aria-label="Brand">
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select value={filters.status} onChange={(e) => update({ ...filters, status: e.target.value })} className={inputClass()} aria-label="Status">
            <option value="all">Any status</option>
            <option value="active">Published</option>
            <option value="draft">Draft</option>
          </select>
          <select value={filters.stock} onChange={(e) => update({ ...filters, stock: e.target.value })} className={inputClass()} aria-label="Stock">
            <option value="all">Any stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <Alert>{actionError}</Alert>
        {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
        {isError && <Alert>{getErrorMessage(error)}</Alert>}
        {!isLoading && !isError && products.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="font-medium">No products found</p>
            <p className="mt-1 text-sm text-gray-500">Try different filters, or add a product.</p>
          </div>
        )}

        {products.length > 0 && (
          <div className={`overflow-x-auto ${isFetching ? "opacity-60" : ""}`}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-gray-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Product</th>
                  <th className="py-2 pr-3 font-medium">Category</th>
                  <th className="py-2 pr-3 font-medium">Price</th>
                  <th className="py-2 pr-3 font-medium">Stock</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  {canWrite && <th className="py-2 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id} className="border-b border-gray-100">
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? (
                          <img src={p.images[0].url} alt="" className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-gray-100" />
                        )}
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-gray-500">
                            {p.variants?.length ? `${p.variants.length} variants` : p.sku || "No SKU"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-gray-600">{p.category?.name || "—"}</td>
                    <td className="py-2 pr-3">{formatMoney(p.price)}</td>
                    <td className="py-2 pr-3">
                      <StockBadge product={p} />
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`rounded px-2 py-0.5 text-xs ${p.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {p.isActive ? "Published" : "Draft"}
                      </span>
                    </td>
                    {canWrite && (
                      <td className="space-x-3 whitespace-nowrap py-2 text-xs">
                        <Link to={`/admin/products/${p._id}/edit`} className="text-blue-600 hover:underline">
                          Edit
                        </Link>
                        <button className="text-red-600 hover:underline" onClick={() => handleDelete(p)}>
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Page {pagination.page} of {pagination.pages} · {pagination.total} products
            </span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => goToPage(page - 1)} className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40">
                Previous
              </button>
              <button disabled={page >= pagination.pages} onClick={() => goToPage(page + 1)} className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
