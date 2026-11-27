const STORAGE_KEY = "guest_cart_v1";
const PRODUCT_ID_PATTERN = /^[0-9a-f]{24}$/i;

export const MAX_QTY = 10;
export const MAX_GUEST_ITEMS = 50;

export const lineKey = (productId, variantSku) => `${productId}__${variantSku || "none"}`;

const isValidItem = (item) =>
  item &&
  typeof item.productId === "string" &&
  PRODUCT_ID_PATTERN.test(item.productId) &&
  (item.variantSku == null || typeof item.variantSku === "string") &&
  Number.isInteger(item.quantity) &&
  item.quantity > 0 &&
  item.quantity <= MAX_QTY;

export const readGuestItems = () => {
  let stored;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    throw new Error("Unable to access your saved cart in this browser.");
  }

  if (!stored) return [];
  let parsed;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error("Your saved cart could not be read. Clear the saved cart data and try again.");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("Your saved cart has an invalid format. Clear the saved cart data and try again.");
  }

  return parsed.filter(isValidItem).slice(0, MAX_GUEST_ITEMS).map(({ productId, variantSku, quantity }) => ({
    productId,
    variantSku: variantSku || null,
    quantity,
  }));
};

export const writeGuestItems = (items) => {
  const safeItems = items.map(({ productId, variantSku, quantity }) => ({
    productId,
    variantSku: variantSku || null,
    quantity,
  }));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeItems));
  } catch {
    throw new Error("Unable to save your cart in this browser. Check your storage settings and try again.");
  }
};

export const clearGuestItems = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    throw new Error("Unable to clear your saved cart from this browser.");
  }
};
