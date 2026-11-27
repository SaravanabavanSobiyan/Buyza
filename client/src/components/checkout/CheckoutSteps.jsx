const STEPS = ["Address & delivery", "Payment", "Review"];

export default function CheckoutSteps({ current }) {
  return (
    <ol
      aria-label="Checkout progress"
      className="mb-8 grid grid-cols-3 overflow-hidden rounded-2xl border border-[#e8e1d7] bg-white shadow-sm"
    >
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={`relative flex min-w-0 items-center gap-2 border-b-2 px-3 py-4 sm:gap-3 sm:px-5 ${
              active
                ? "border-[#c9a96e] bg-[#faf7f2]"
                : done
                  ? "border-[#c9a96e]"
                  : "border-transparent"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                done || active
                  ? "bg-[#46382f] text-white"
                  : "bg-[#f1eee9] text-[#81786e]"
              }`}
            >
              {done ? "✓" : index + 1}
            </span>
            <span
              className={`min-w-0 text-xs font-semibold leading-tight sm:text-sm ${
                active ? "text-[#46382f]" : done ? "text-[#6b665f]" : "text-[#9a9389]"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
