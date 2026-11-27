import { useEffect, useState } from "react";
import { isMoney } from "../utils/money";
import { inputClass } from "./FormField";

export default function CatalogFilters({ filters, brands, hasFilters, onChange, onClear, hideTitle = false }) {
  const [minText, setMinText] = useState(filters.minPrice);
  const [maxText, setMaxText] = useState(filters.maxPrice);
  const [priceError, setPriceError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      const min = minText.trim();
      const max = maxText.trim();

      if ((min && !isMoney(min)) || (max && !isMoney(max))) {
        setPriceError("Enter amounts like 1500 or 1500.50");
        return;
      }

      if (min && max && Number(min) > Number(max)) {
        setPriceError("Minimum can't be higher than maximum");
        return;
      }

      setPriceError("");
      if (min !== filters.minPrice || max !== filters.maxPrice) {
        onChange({ minPrice: min, maxPrice: max });
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [minText, maxText, filters.minPrice, filters.maxPrice, onChange]);

  const toggleBrand = (slug) => {
    const next = filters.brands.includes(slug) ? filters.brands.filter((brand) => brand !== slug) : [...filters.brands, slug];
    onChange({ brand: next });
  };

  return (
    <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-4 text-sm">
      {(hasFilters || !hideTitle) && (
        <div className="flex items-center justify-between">
          {!hideTitle && <h2 className="font-medium">Filters</h2>}
          {hasFilters && (
            <button type="button" onClick={onClear} className="tap-y inline-flex items-center px-1 text-blue-600 hover:underline">
              Clear all
            </button>
          )}
        </div>
      )}

      <fieldset>
        <legend className="mb-2 font-medium">Price (LKR)</legend>
        <div className="flex items-center gap-2">
          <input
            inputMode="decimal"
            placeholder="Min"
            aria-label="Minimum price"
            value={minText}
            onChange={(event) => setMinText(event.target.value)}
            className={inputClass(priceError)}
          />
          <span className="text-gray-400">–</span>
          <input
            inputMode="decimal"
            placeholder="Max"
            aria-label="Maximum price"
            value={maxText}
            onChange={(event) => setMaxText(event.target.value)}
            className={inputClass(priceError)}
          />
        </div>
        {priceError && <p className="mt-1 text-xs text-red-600">{priceError}</p>}
      </fieldset>

      {brands.length > 0 && (
        <fieldset>
          <legend className="mb-2 font-medium">Brand</legend>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {brands.map((brand) => (
              <label key={brand._id} className="tap-y flex w-full items-center gap-2 text-gray-700">
                <input className="h-5 w-5 shrink-0" type="checkbox" checked={filters.brands.includes(brand.slug)} onChange={() => toggleBrand(brand.slug)} />
                {brand.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="mb-2 font-medium">Availability</legend>
        <label className="tap-y flex w-full items-center gap-2 text-gray-700">
          <input className="h-5 w-5 shrink-0" type="checkbox" checked={filters.inStock} onChange={(event) => onChange({ inStock: event.target.checked })} />
          In stock only
        </label>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-medium">Highlights</legend>
        <label className="tap-y flex w-full items-center gap-2 text-gray-700">
          <input className="h-5 w-5 shrink-0" type="checkbox" checked={filters.featured} onChange={(event) => onChange({ featured: event.target.checked })} />
          Featured only
        </label>
      </fieldset>
    </div>
  );
}
