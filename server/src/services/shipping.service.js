export function calculateShippingRate(method, province, subtotal, now = new Date()) {
  const provinceRate = method.provinceRates.find((rate) => rate.province === province);
  const isFree =
    method.freeShippingThreshold != null && subtotal > method.freeShippingThreshold;
  const price = isFree ? 0 : (provinceRate?.price ?? method.flatPrice);
  const minDate = new Date(now);
  const maxDate = new Date(now);
  minDate.setUTCDate(minDate.getUTCDate() + method.minDeliveryDays);
  maxDate.setUTCDate(maxDate.getUTCDate() + method.maxDeliveryDays);

  return {
    price,
    isFree,
    delivery: {
      minDays: method.minDeliveryDays,
      maxDays: method.maxDeliveryDays,
      minDate: minDate.toISOString().slice(0, 10),
      maxDate: maxDate.toISOString().slice(0, 10),
    },
  };
}
