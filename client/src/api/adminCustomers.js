import api from "./axios";

export const fetchCustomers = (params) =>
  api.get("/admin/customers", { params }).then((r) => r.data);
export const fetchCustomer = (id) =>
  api.get(`/admin/customers/${id}`).then((r) => r.data);
export const fetchCustomerOrders = (id, params) =>
  api.get(`/admin/customers/${id}/orders`, { params }).then((r) => r.data);
export const blockCustomer = (id, reason) =>
  api.post(`/admin/customers/${id}/block`, { reason }).then((r) => r.data);
export const unblockCustomer = (id) =>
  api.post(`/admin/customers/${id}/unblock`).then((r) => r.data);
