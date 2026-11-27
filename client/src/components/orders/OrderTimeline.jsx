import { formatDateTime } from "../../utils/format";

const STEPS = [
  { key: "pending", label: "Order placed" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

const REASON_LABELS = {
  changed_mind: "Changed my mind",
  ordered_by_mistake: "Ordered by mistake",
  found_cheaper: "Found a cheaper price",
  delivery_too_slow: "Delivery takes too long",
  other: "Other",
};

export default function OrderTimeline({ order }) {
  if (order.status === "cancelled") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
        <p className="font-semibold text-red-800">Order cancelled</p>
        <p className="text-red-700">{formatDateTime(order.cancelledAt)}</p>
        {order.cancelReason && (
          <p className="mt-1 text-red-700">
            Reason: {REASON_LABELS[order.cancelReason] || order.cancelReason}
          </p>
        )}
        {order.cancelNote && <p className="mt-1 text-red-700">{order.cancelNote}</p>}
        {order.payment.status === "refund_pending" && (
          <p className="mt-1 text-red-700">Your refund is being processed.</p>
        )}
      </div>
    );
  }

  const reachedAt = {};
  (order.statusHistory || []).forEach((history) => {
    if (!reachedAt[history.status]) reachedAt[history.status] = history.at;
  });
  const currentIndex = STEPS.findIndex((step) => step.key === order.status);

  return (
    <ol className="space-y-4">
      {STEPS.map((step, index) => {
        const done = index <= currentIndex;
        return (
          <li key={step.key} className="flex gap-3">
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                done ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              {done ? "✓" : index + 1}
            </span>
            <div>
              <p className={done ? "font-medium" : "text-gray-400"}>{step.label}</p>
              {reachedAt[step.key] && (
                <p className="text-xs text-gray-500">
                  {formatDateTime(reachedAt[step.key])}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
