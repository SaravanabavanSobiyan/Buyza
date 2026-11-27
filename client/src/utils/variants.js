export function normalizeVariants(variants = []) {
  return variants.map((variant) => {
    const hasOptions = Object.keys(variant.attributes || {}).length > 0;
    return {
      ...variant,
      synthetic: !hasOptions,
      attributes: hasOptions ? variant.attributes : { Variant: variant.sku },
    };
  });
}

export function getOptions(variants) {
  const valuesByName = new Map();
  variants.forEach((variant) =>
    Object.entries(variant.attributes).forEach(([name, value]) => {
      if (!valuesByName.has(name)) valuesByName.set(name, []);
      if (!valuesByName.get(name).includes(value)) valuesByName.get(name).push(value);
    })
  );
  return [...valuesByName].map(([name, values]) => ({ name, values }));
}

const fits = (variant, selected, skipName) =>
  Object.entries(selected).every(([name, value]) => name === skipName || variant.attributes[name] === value);

export function isValueAvailable(variants, selected, name, value) {
  return variants.some(
    (variant) => variant.attributes[name] === value && variant.stock > 0 && fits(variant, selected, name)
  );
}

export function findVariant(variants, options, selected) {
  if (options.length === 0 || options.some((option) => !selected[option.name])) return null;
  return variants.find((variant) => options.every((option) => variant.attributes[option.name] === selected[option.name])) || null;
}

export function priceSummary(variants, basePrice, variant) {
  if (variant) return { amount: variant.price, from: false };
  if (variants.length === 0) return { amount: basePrice, from: false };
  const prices = variants.map((item) => item.price);
  const min = Math.min(...prices);
  return { amount: min, from: min !== Math.max(...prices) };
}

export const stockStatus = (stock, threshold) => (stock <= 0 ? "out" : stock <= threshold ? "low" : "in");
