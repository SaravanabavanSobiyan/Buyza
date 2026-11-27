import { useEffect, useState } from "react";

const REASONS = [
  ["changed_mind", "Changed my mind"],
  ["ordered_by_mistake", "Ordered by mistake"],
  ["found_cheaper", "Found a cheaper price"],
  ["delivery_too_slow", "Delivery takes too long"],
  ["other", "Other"],
];

export default function CancelOrderModal({
  orderNumber,
  paymentStatus,
  onClose,
  onConfirm,
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, submitting]);

  const submit = async (event) => {
    event.preventDefault();
    if (!reason || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm({ reason, note: note.trim() || undefined });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-order-title"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !submitting && onClose()}
      />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id="cancel-order-title" className="text-lg font-semibold">
          Cancel order {orderNumber}?
        </h2>
        <p className="text-sm text-gray-600">
          Cancelling applies to the whole order and can&apos;t be undone. Items
          that haven&apos;t shipped will be returned to stock.
        </p>
        {paymentStatus === "paid" && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Payment has been collected. Cancelling flags a refund for store
            processing; it will not be issued automatically.
          </p>
        )}

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Reason</span>
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="">Select a reason...</option>
            {REASONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Anything else? (optional)</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={300}
            rows={3}
            className="w-full rounded-lg border px-3 py-2"
          />
        </label>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
          >
            Keep order
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="cancel-order-submit rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:cursor-wait disabled:opacity-70"
          >
            {submitting ? "Cancelling..." : "Cancel order"}
          </button>
        </div>
      </form>
    </div>
  );
}
