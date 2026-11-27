import { Link } from 'react-router-dom';

const ROWS = [
  ['pending', 'Pending', 'bg-yellow-400'],
  ['processing', 'Processing', 'bg-blue-500'],
  ['shipped', 'Shipped', 'bg-indigo-500'],
  ['delivered', 'Delivered', 'bg-green-500'],
  ['cancelled', 'Cancelled', 'bg-red-500'],
];

export default function OrdersByStatus({ data, from, to }) {
  const max = Math.max(1, ...Object.values(data.counts));
  return (
    <ul className="space-y-3">
      {ROWS.map(([key, label, color]) => {
        const n = data.counts[key] ?? 0;
        return (
          <li key={key}>
            <Link to={`/admin/orders?status=${key}&from=${from}&to=${to}`} className="block rounded hover:bg-gray-50"
              aria-label={`${label}: ${n} orders. Open the list.`}>
              <div className="mb-1 flex justify-between text-sm"><span>{label}</span><span className="font-medium">{n}</span></div>
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full ${color}`} style={{ width: `${(n / max) * 100}%` }} />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
