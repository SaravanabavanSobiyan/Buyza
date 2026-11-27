export const REQUIRED_CURRENT = {
  processing: "pending",
  shipped: "processing",
  delivered: "shipped",
};
export const CANCELLABLE_BY_ADMIN = ["pending", "processing", "shipped"];

const NEXT = {
  pending: ["processing"],
  processing: ["shipped"],
  shipped: ["delivered"],
};

export const nextStatuses = (order, { canCancel }) => {
  const next = [...(NEXT[order.status] || [])];
  if (canCancel && CANCELLABLE_BY_ADMIN.includes(order.status)) next.push("cancelled");
  return next;
};

export const canMarkPaid = (order) =>
  order.payment?.method === "cod" &&
  order.payment?.status === "pending" &&
  ["shipped", "delivered"].includes(order.status);
