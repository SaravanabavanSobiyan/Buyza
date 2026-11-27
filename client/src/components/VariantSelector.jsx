import { isValueAvailable } from "../utils/variants";

export default function VariantSelector({ options, variants, selected, onSelect, onClear }) {
  return (
    <div className="space-y-4">
      {options.map((option) => (
        <fieldset key={option.name}>
          <legend className="mb-2 text-sm font-medium">
            {option.name}
            {selected[option.name] && <span className="ml-1 font-normal text-gray-500">: {selected[option.name]}</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const active = selected[option.name] === value;
              const available = isValueAvailable(variants, selected, option.name, value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  disabled={!available && !active}
                  onClick={() => onSelect(option.name, value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    active
                      ? "border-gray-900 bg-gray-900 text-white"
                      : available
                        ? "border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                        : "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 line-through"
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      {variants.length > 1 && Object.keys(selected).length > 0 && (
        <button type="button" onClick={onClear} className="text-sm text-blue-600 hover:underline">
          Clear selection
        </button>
      )}
    </div>
  );
}
