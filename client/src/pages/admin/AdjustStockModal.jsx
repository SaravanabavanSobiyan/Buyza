import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adjustStock } from "../../api/adminInventory";
import { getErrorMessage } from "../../api/axios";
import { formatAttributes } from "../../utils/format";
import Modal from "../../components/Modal";
import FormField, { inputClass } from "../../components/FormField";
import Button from "../../components/Button";
import Alert from "../../components/Alert";

const MODES = [
  { value: "add", label: "Add stock" },
  { value: "remove", label: "Remove stock" },
  { value: "set", label: "Set exact amount" },
];

const REASONS = [
  { value: "restock", label: "Restock" },
  { value: "return", label: "Customer return" },
  { value: "damage", label: "Damaged or lost" },
  { value: "correction", label: "Stock count correction" },
  { value: "other", label: "Other" },
];

const defaultReason = { add: "restock", remove: "damage", set: "correction" };

export default function AdjustStockModal({ row, onClose }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("restock");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const qty = /^\d+$/.test(quantity) ? Number(quantity) : null;
  const preview = qty === null ? null : mode === "add" ? row.stock + qty : mode === "remove" ? row.stock - qty : qty;

  const mutation = useMutation({
    mutationFn: adjustStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory", "alerts"] });
    },
  });

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setReason(defaultReason[nextMode]);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (qty === null) return setError("Enter a whole number");
    if (mode !== "set" && qty < 1) return setError("Enter at least 1");
    if (preview < 0) return setError(`You can't remove ${qty}. Only ${row.stock} in stock.`);

    try {
      await mutation.mutateAsync({
        productId: row.productId,
        sku: row.hasVariants ? row.sku : undefined,
        mode,
        quantity: qty,
        reason,
        note: note.trim(),
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const variantLabel = formatAttributes(row.attributes);

  return (
    <Modal title="Adjust stock" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <div className="rounded-lg bg-gray-50 p-3 text-sm">
          <p className="font-medium">{row.name}</p>
          <p className="text-gray-500">
            {variantLabel || "No variants"} · SKU {row.sku || "none"}
          </p>
          <p className="mt-1">
            Current stock: <strong>{row.stock}</strong>
          </p>
        </div>

        {error ? <Alert>{error}</Alert> : null}

        <div>
          <label htmlFor="mode" className="mb-1 block text-sm font-medium text-gray-700">
            Action
          </label>
          <select id="mode" value={mode} onChange={(event) => changeMode(event.target.value)} className={inputClass()}>
            {MODES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <FormField
          label={mode === "set" ? "New stock level" : "Quantity"}
          name="quantity"
          inputMode="numeric"
          value={quantity}
          onChange={(event) => {
            setQuantity(event.target.value);
            setError("");
          }}
          hint={preview !== null && preview >= 0 ? `New stock will be ${preview}` : undefined}
        />

        <div>
          <label htmlFor="reason" className="mb-1 block text-sm font-medium text-gray-700">
            Reason
          </label>
          <select id="reason" value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass()}>
            {REASONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <FormField label="Note (optional)" name="note" maxLength={200} value={note} onChange={(event) => setNote(event.target.value)} />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
