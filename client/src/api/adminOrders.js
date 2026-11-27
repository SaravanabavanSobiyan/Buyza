import api from "./axios";

export const fetchAdminOrders = (params) =>
  api.get("/admin/orders", { params }).then((response) => response.data);

export const fetchAdminOrder = (orderNumber) =>
  api.get(`/admin/orders/${encodeURIComponent(orderNumber)}`).then((response) => response.data);

export const changeOrderStatus = (orderNumber, body) =>
  api.patch(`/admin/orders/${encodeURIComponent(orderNumber)}/status`, body)
    .then((response) => response.data.order);

export const markOrderPaid = (orderNumber) =>
  api.post(`/admin/orders/${encodeURIComponent(orderNumber)}/mark-paid`)
    .then((response) => response.data.order);

export const openOrderPdf = async (orderNumber, kind) => {
  const tab = window.open("", "_blank");
  try {
    const response = await api.get(
      `/admin/orders/${encodeURIComponent(orderNumber)}/${kind}`,
      { responseType: "blob" }
    );
    const url = URL.createObjectURL(
      new Blob([response.data], { type: "application/pdf" })
    );
    if (tab) tab.location.href = url;
    else {
      const link = document.createElement("a");
      link.href = url;
      link.download = `${kind}-${orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
};
