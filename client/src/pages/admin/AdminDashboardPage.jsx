import { useState } from 'react';
import useFetch from '../../hooks/useFetch';
import useDashboardRange from '../../hooks/useDashboardRange';
import { fetchSummary, fetchSales, fetchOrdersByStatus, fetchTopProducts, fetchLowStock } from '../../api/adminDashboard';
import DateRangePicker from '../../components/admin/dashboard/DateRangePicker';
import StatCard from '../../components/admin/dashboard/StatCard';
import Widget from '../../components/admin/dashboard/Widget';
import SalesChart from '../../components/admin/dashboard/SalesChart';
import OrdersByStatus from '../../components/admin/dashboard/OrdersByStatus';
import TopProducts from '../../components/admin/dashboard/TopProducts';
import LowStockList from '../../components/admin/dashboard/LowStockList';
import { formatPrice } from '../../utils/formatPrice';
import { formatDayLong } from '../../utils/dates';

export default function AdminDashboardPage() {
  const { from, to, days, setRange } = useDashboardRange();
  const [by, setBy] = useState('revenue');
  const [refresh, setRefresh] = useState(0);
  const range = { from, to };
  const summary = useFetch(() => fetchSummary(range), [from, to, refresh]);
  const sales = useFetch(() => fetchSales(range), [from, to, refresh]);
  const statuses = useFetch(() => fetchOrdersByStatus(range), [from, to, refresh]);
  const top = useFetch(() => fetchTopProducts(range, by), [from, to, by, refresh]);
  const low = useFetch(() => fetchLowStock(), [refresh]);
  const vs = `vs previous ${days} day${days === 1 ? '' : 's'}`;

  return (
    <div className="mx-auto max-w-7xl min-w-0 px-0 py-2 sm:px-1 sm:py-4">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold">Dashboard</h1><p className="text-sm text-gray-500">{formatDayLong(from)} to {formatDayLong(to)} ({days} day{days === 1 ? '' : 's'})</p></div>
        <div className="flex flex-wrap items-end gap-3">
          <DateRangePicker from={from} to={to} onChange={setRange} />
          <button onClick={() => setRefresh((n) => n + 1)} className="rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-gray-50">Refresh</button>
        </div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Revenue" state={summary} pick={(d) => d.revenue} format={formatPrice} caption={() => vs} hint={(d) => `${formatPrice(d.collected)} collected`} />
        <StatCard label="Orders" state={summary} pick={(d) => d.orders} format={(n) => n.toLocaleString('en-LK')} caption={() => vs} hint={(d) => d.cancelledOrders > 0 ? `${d.cancelledOrders} cancelled (not counted)` : 'None cancelled'} />
        <StatCard label="Average order" state={summary} pick={(d) => d.averageOrderValue} format={formatPrice} caption={() => vs} />
        <StatCard label="New customers" state={summary} pick={(d) => d.newCustomers} format={(n) => n.toLocaleString('en-LK')} caption={() => vs} />
        <StatCard label="Low stock" state={summary} pick={(d) => ({ value: d.lowStock.count })} format={(n) => n.toLocaleString('en-LK')} hint={(d) => d.lowStock.outOfStock > 0 ? `${d.lowStock.outOfStock} out of stock` : 'None out of stock'} to="/admin/inventory" />
      </div>
      <Widget title="Sales" state={sales} skeleton="h-72" isEmpty={(d) => d.every((x) => x.orders === 0)} emptyText="No orders in this period." className="mb-6">
        {(d) => <SalesChart days={d} />}
      </Widget>
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Widget title="Orders by status" state={statuses} isEmpty={(d) => d.total === 0} emptyText="No orders in this period.">
          {(d) => <OrdersByStatus data={d} from={from} to={to} />}
        </Widget>
        <Widget title="Top products" state={top} isEmpty={(d) => d.length === 0} emptyText="No sales in this period." action={
          <div className="inline-flex overflow-hidden rounded-lg border text-xs" role="group" aria-label="Rank products by">
            {[['revenue', 'Revenue'], ['quantity', 'Units']].map(([value, label]) => (
              <button key={value} onClick={() => setBy(value)} aria-pressed={by === value}
                className={`px-3 py-1 ${by === value ? 'bg-indigo-600 text-white' : 'hover:bg-gray-50'}`}>{label}</button>
            ))}
          </div>
        }>
          {(d) => <TopProducts products={d} />}
        </Widget>
      </div>
      <Widget title="Low stock" state={low} isEmpty={(d) => d.total === 0} emptyText="Everything is well stocked.">
        {(d) => <LowStockList data={d} />}
      </Widget>
    </div>
  );
}
