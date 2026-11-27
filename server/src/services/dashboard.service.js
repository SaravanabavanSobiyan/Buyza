import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { ORDER_STATUSES } from '../constants/order.js';
import { eachDay } from '../utils/dateRange.js';

export const DEFAULT_LOW_STOCK = Number(process.env.LOW_STOCK_THRESHOLD) || 5;
const round2 = (n) => Math.round((n || 0) * 100) / 100;
const pct = (current, previous) => (previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null);
const metric = (value, previous) => ({ value, previous, changePct: pct(value, previous) });
const inRange = (start, end) => ({ createdAt: { $gte: start, $lte: end } });

const periodStats = async (start, end) => {
  const [row] = await Order.aggregate([
    { $match: inRange(start, end) },
    {
      $group: {
        _id: null,
        orders: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        revenue: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, '$total', 0] } },
        collected: {
          $sum: {
            $cond: [
              { $and: [{ $ne: ['$status', 'cancelled'] }, { $eq: ['$payment.status', 'paid'] }] },
              '$total',
              0,
            ],
          },
        },
      },
    },
  ]);
  return {
    orders: row?.orders ?? 0,
    cancelled: row?.cancelled ?? 0,
    revenue: round2(row?.revenue),
    collected: round2(row?.collected),
  };
};

const countNewCustomers = (start, end) => User.countDocuments({ role: 'customer', ...inRange(start, end) });

const lowStockRows = [
  { $match: { isActive: true, isDeleted: { $ne: true } } },
  {
    $project: {
      name: 1,
      slug: 1,
      image: { $arrayElemAt: ['$images.url', 0] },
      threshold: { $ifNull: ['$lowStockThreshold', DEFAULT_LOW_STOCK] },
      rows: {
        $cond: [
          { $gt: [{ $size: { $ifNull: ['$variants', []] } }, 0] },
          { $map: { input: '$variants', as: 'v', in: { sku: '$$v.sku', stock: '$$v.stock' } } },
          [{ sku: null, stock: '$stock' }],
        ],
      },
    },
  },
  { $unwind: '$rows' },
  { $match: { $expr: { $lte: ['$rows.stock', '$threshold'] } } },
  { $sort: { 'rows.stock': 1, name: 1 } },
];

export const getLowStock = async ({ limit = 10 } = {}) => {
  const [res] = await Product.aggregate([
    ...lowStockRows,
    {
      $facet: {
        items: [
          { $limit: limit },
          { $project: { _id: 0, productId: '$_id', name: 1, slug: 1, image: 1, sku: '$rows.sku', stock: '$rows.stock', threshold: 1 } },
        ],
        total: [{ $count: 'n' }],
        out: [{ $match: { 'rows.stock': { $lte: 0 } } }, { $count: 'n' }],
      },
    },
  ]);
  return { items: res?.items ?? [], total: res?.total?.[0]?.n ?? 0, outOfStock: res?.out?.[0]?.n ?? 0 };
};

export const getSummary = async (range) => {
  const [cur, prev, newCur, newPrev, low] = await Promise.all([
    periodStats(range.start, range.end),
    periodStats(range.prev.start, range.prev.end),
    countNewCustomers(range.start, range.end),
    countNewCustomers(range.prev.start, range.prev.end),
    getLowStock({ limit: 1 }),
  ]);
  const average = (s) => (s.orders > 0 ? round2(s.revenue / s.orders) : 0);
  return {
    range: { from: range.from, to: range.to, days: range.days },
    previousRange: { from: range.prev.from, to: range.prev.to },
    revenue: metric(cur.revenue, prev.revenue),
    orders: metric(cur.orders, prev.orders),
    averageOrderValue: metric(average(cur), average(prev)),
    newCustomers: metric(newCur, newPrev),
    collected: cur.collected,
    outstanding: round2(cur.revenue - cur.collected),
    cancelledOrders: cur.cancelled,
    lowStock: { count: low.total, outOfStock: low.outOfStock },
  };
};

export const getSalesOverTime = async (range) => {
  const rows = await Order.aggregate([
    { $match: { ...inRange(range.start, range.end), status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Colombo' } },
        revenue: { $sum: '$total' },
        orders: { $sum: 1 },
      },
    },
  ]);
  const byDay = new Map(rows.map((r) => [r._id, r]));
  return eachDay(range.from, range.to).map((date) => ({
    date,
    revenue: round2(byDay.get(date)?.revenue),
    orders: byDay.get(date)?.orders ?? 0,
  }));
};

export const getOrdersByStatus = async (range) => {
  const rows = await Order.aggregate([
    { $match: inRange(range.start, range.end) },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
  rows.forEach((r) => { counts[r._id] = r.count; });
  return { counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
};

export const getTopProducts = async (range, { limit, by }) => {
  const sort = by === 'quantity'
    ? { quantity: -1, revenue: -1, _id: 1 }
    : { revenue: -1, quantity: -1, _id: 1 };
  const rows = await Order.aggregate([
    { $match: { ...inRange(range.start, range.end), status: { $ne: 'cancelled' } } },
    { $sort: { createdAt: -1 } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        slug: { $first: '$items.slug' },
        image: { $first: '$items.image' },
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.lineTotal' },
      },
    },
    { $sort: sort },
    { $limit: limit },
    { $project: { _id: 0, productId: '$_id', name: 1, slug: 1, image: 1, quantity: 1, revenue: 1 } },
  ]);
  return rows.map((r) => ({ ...r, revenue: round2(r.revenue) }));
};
