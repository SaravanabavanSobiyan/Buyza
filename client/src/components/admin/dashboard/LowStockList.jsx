import { Link } from 'react-router-dom';

export default function LowStockList({ data }) {
  return (
    <>
      <ul className="divide-y">
        {data.items.map((item) => (
          <li key={`${item.productId}-${item.sku ?? ''}`}>
            <Link to="/admin/inventory" className="flex items-center gap-3 py-3 text-sm hover:bg-gray-50">
              <img src={item.image || 'https://placehold.co/40x40?text=?'} alt="" className="h-10 w-10 rounded object-cover" />
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{item.name}</p>{item.sku && <p className="text-xs text-gray-500">{item.sku}</p>}</div>
              {item.stock <= 0
                ? <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Out of stock</span>
                : <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">{item.stock} left</span>}
            </Link>
          </li>
        ))}
      </ul>
      {data.total > data.items.length && (
        <p className="mt-3 text-center text-xs text-gray-500">
          Showing {data.items.length} of {data.total}. <Link to="/admin/inventory" className="text-indigo-600 hover:underline">Open inventory</Link>
        </p>
      )}
    </>
  );
}
