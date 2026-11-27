import { formatMoney } from "../../utils/money";
import { formatEta } from "../../utils/formatEta";

export default function ShippingOptions({
  options,
  selectedId,
  onSelect,
  disabled = false,
}) {
  if (options.length === 0) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        No delivery methods are available for this address.
      </p>
    );
  }

  return (
    <fieldset disabled={disabled} className="space-y-3 disabled:opacity-60">
      <legend className="mb-1 text-lg font-bold tracking-tight text-[#46382f]">Choose your delivery</legend>
      <p className="mb-4 text-sm text-[#6b665f]">Select the delivery option that works best for you.</p>
      {options.map((option) => (
        <label
          key={option.id}
          className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 transition sm:p-5 ${
            selectedId === option.id
              ? "border-[#c9a96e] bg-[#faf7f2] shadow-[0_0_0_1px_#c9a96e]"
              : "border-[#e8e1d7] bg-white hover:border-[#c9a96e]/70 hover:bg-[#fdfbf8]"
          }`}
        >
          <span className="flex items-center gap-3">
            <input
              type="radio"
              name="shipping"
              checked={selectedId === option.id}
              onChange={() => onSelect(option.id)}
              className="h-4 w-4 accent-[#46382f]"
            />
            <span>
              <span className="block font-semibold text-[#46382f]">{option.name}</span>
              <span className="mt-1 block text-sm text-[#6b665f]">
                {formatEta(option.etaMin, option.etaMax)}
              </span>
            </span>
          </span>
          <span className="shrink-0 text-sm font-bold text-[#46382f]">
            {option.isFree ? "Free" : formatMoney(option.price)}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
