import { formatPrice } from '../../../utils/formatPrice';

export default function TopProducts({ products }) {
  return (
    <ol className="divide-y">
      {products.map((p, i) => (
        <li key={p.productId} className="flex items-center gap-3 py-3 text-sm">
          <span className="w-5 text-center text-gray-400">{i + 1}</span>
          <img src={p.image || 'https://placehold.co/40x40?text=?'} alt="" className="h-10 w-10 rounded object-cover" />
          <div className="min-w-0 flex-1"><p className="truncate font-medium">{p.name}</p><p className="text-xs text-gray-500">{p.quantity} sold</p></div>
          <span className="whitespace-nowrap font-medium">{formatPrice(p.revenue)}</span>
        </li>
      ))}
    </ol>
  );
}
