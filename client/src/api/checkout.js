import api from "./axios";

export const normalizeQuote = (raw) => {
  const totals = raw.totals || {};
  return {
    items: raw.pricedLines ?? raw.items ?? [],
    subtotal: totals.subtotal ?? raw.subtotal ?? 0,
    discount: totals.discount ?? raw.discount ?? 0,
    shipping: totals.shipping ?? raw.shipping ?? 0,
    total: totals.total ?? raw.total ?? 0,
    options: (raw.shippingOptions ?? []).map((option) => ({
      id: option.id ?? option._id,
      name: option.name,
      description: option.description,
      price: option.price ?? 0,
      isFree: option.isFree ?? option.price === 0,
      etaMin: option.delivery?.minDate ?? option.estimatedDelivery?.min ?? option.etaMin ?? option.delivery?.minDays ?? null,
      etaMax: option.delivery?.maxDate ?? option.estimatedDelivery?.max ?? option.etaMax ?? option.delivery?.maxDays ?? null,
    })),
    selectedId:
      raw.selectedShippingMethod?.id ?? raw.selectedShippingMethod?._id ?? raw.selectedShippingId ?? null,
    freeShippingThreshold: raw.freeShippingThreshold ?? null,
    amountToFreeShipping: raw.amountToFreeShipping ?? null,
    canCheckout: raw.canCheckout ?? true,
    problems: raw.problems ?? [],
  };
};

export const requestQuote = async ({
  address,
  addressId,
  email,
  items,
  buyNow,
  shippingMethodId,
}) => {
  const body = {};
  if (addressId) body.addressId = addressId;
  else body.address = address;
  if (email) body.email = email;
  if (shippingMethodId) body.shippingMethodId = shippingMethodId;
  if (items) body.items = items;
  if (buyNow) body.buyNow = true;

  const { data } = await api.post("/checkout/quote", body);
  return normalizeQuote(data.quote ?? data);
};
