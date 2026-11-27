const MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };

export const escapeXml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => MAP[character]);
