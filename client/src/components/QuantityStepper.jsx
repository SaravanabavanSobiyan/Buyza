export default function QuantityStepper({ value, max, onChange, disabled = false }) {
  const limit = Math.max(1, max);
  const set = (nextValue) => onChange(Math.min(Math.max(1, nextValue), limit));

  return (
    <div className="inline-flex items-center rounded-lg border border-gray-300" role="group" aria-label="Quantity">
      <button
        type="button"
        onClick={() => set(value - 1)}
        disabled={disabled || value <= 1}
        aria-label="Decrease quantity"
        className="tap inline-flex items-center justify-center px-3 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        −
      </button>
      <input
        inputMode="numeric"
        aria-label="Quantity"
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const nextValue = parseInt(event.target.value.replace(/\D/g, ""), 10);
          set(Number.isNaN(nextValue) ? 1 : nextValue);
        }}
        className="h-11 w-12 border-x border-gray-300 text-center text-sm outline-none disabled:bg-gray-50"
      />
      <button
        type="button"
        onClick={() => set(value + 1)}
        disabled={disabled || value >= limit}
        aria-label="Increase quantity"
        className="tap inline-flex items-center justify-center px-3 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
