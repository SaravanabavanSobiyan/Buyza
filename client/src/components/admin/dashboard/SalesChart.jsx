import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompact } from '../../../utils/formatCompact';
import { formatPrice } from '../../../utils/formatPrice';
import { formatDay, formatDayLong } from '../../../utils/dates';

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-sm shadow">
      <p className="font-medium">{formatDayLong(d.date)}</p>
      <p className="text-gray-700">{formatPrice(d.revenue)}</p>
      <p className="text-xs text-gray-500">{d.orders} order{d.orders === 1 ? '' : 's'}</p>
    </div>
  );
}

export default function SalesChart({ days }) {
  const total = days.reduce((sum, d) => sum + d.revenue, 0);
  const label = `Daily revenue from ${formatDayLong(days[0].date)} to ${formatDayLong(days[days.length - 1].date)}, ${formatPrice(total)} in total`;
  return (
    <div role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={days} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatDay} minTickGap={24} tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={formatCompact} width={56} tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} fill="url(#revenueFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
