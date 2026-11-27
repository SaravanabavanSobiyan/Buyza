import api from "./axios";

export const fetchOrders = async (params) => {
  const { data } = await api.get("/orders", { params });
  return data;
};

export const fetchAdminOrders = async (params) => {
  const { data } = await api.get("/admin/orders", { params });
  return data;
};

export const updateAdminOrderStatus = async (orderNumber, body) => {
  const { data } = await api.patch(`/admin/orders/${encodeURIComponent(orderNumber)}/status`, body);
  return data.order;
};

export const markAdminOrderPaid = async (orderNumber) => {
  const { data } = await api.post(`/admin/orders/${encodeURIComponent(orderNumber)}/mark-paid`);
  return data.order;
};

export const fetchOrder = async (orderNumber) => {
  const { data } = await api.get(`/orders/${encodeURIComponent(orderNumber)}`);
  return data.order;
};

export const cancelOrder = async (orderNumber, body) => {
  const { data } = await api.post(
    `/orders/${encodeURIComponent(orderNumber)}/cancel`,
    body
  );
  return data.order;
};

export const downloadInvoice = async (orderNumber) => {
  const response = await api.get(
    `/orders/${encodeURIComponent(orderNumber)}/invoice`,
    { responseType: "blob" }
  );
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `invoice-${orderNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
