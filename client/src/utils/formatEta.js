const formatter = new Intl.DateTimeFormat("en-LK", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export const formatEta = (min, max) => {
  if (min == null && max == null) return "Delivery estimate unavailable";
  const low = min ?? max;
  const high = max ?? min;

  if (typeof low === "number" && typeof high === "number") {
    return low === high
      ? `${low} business days`
      : `${low}-${high} business days`;
  }

  const lowDate = new Date(low);
  const highDate = new Date(high);
  if (Number.isNaN(lowDate.getTime()) || Number.isNaN(highDate.getTime())) {
    return "Delivery estimate unavailable";
  }

  const first = formatter.format(lowDate);
  const last = formatter.format(highDate);
  return first === last ? `Arrives ${first}` : `Arrives ${first} – ${last}`;
};
