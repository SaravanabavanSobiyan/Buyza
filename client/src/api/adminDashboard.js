import api from './axios';

const get = (path, params) => api.get(`/admin/dashboard${path}`, { params }).then((r) => r.data);
export const fetchSummary = (range) => get('/summary', range);
export const fetchSales = (range) => get('/sales-over-time', range).then((d) => d.days);
export const fetchOrdersByStatus = (range) => get('/orders-by-status', range);
export const fetchTopProducts = (range, by) => get('/top-products', { ...range, by, limit: 5 }).then((d) => d.products);
export const fetchLowStock = () => get('/low-stock', { limit: 10 });
