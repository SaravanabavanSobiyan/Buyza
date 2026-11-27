export const CANCELLABLE_STATUSES = ["pending", "processing"];

export const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export const CANCEL_REASONS = [
  "changed_mind",
  "ordered_by_mistake",
  "found_cheaper",
  "delivery_too_slow",
  "other",
];

export const CANCEL_REASON_LABELS = {
  changed_mind: 'Changed my mind',
  ordered_by_mistake: 'Ordered by mistake',
  found_cheaper: 'Found a cheaper price',
  delivery_too_slow: 'Delivery takes too long',
  other: 'Other',
};
