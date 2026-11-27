const STYLES = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refund_pending: "bg-orange-100 text-orange-800",
  refunded: "bg-gray-200 text-gray-700",
};
const LABELS = {
  pending: "Unpaid",
  paid: "Paid",
  failed: "Failed",
  refund_pending: "Refund due",
  refunded: "Refunded",
};

export default function PaymentBadge({ status }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status] || "bg-gray-100 text-gray-700"}`}>
      {LABELS[status] || status}
    </span>
  );
}
