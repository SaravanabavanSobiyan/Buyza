// Prices are stored as whole minor units (cents): 1290000 = LKR 12,900.00
export const isMoney = (text) => /^\d+(\.\d{1,2})?$/.test(String(text).trim());
export const toMinor = (text) => Math.round(Number(text) * 100);
export const fromMinor = (minor) => (minor == null ? "" : (minor / 100).toFixed(2));

const formatter = new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" });
export const formatMoney = (minor) => formatter.format((minor || 0) / 100);
