export const formatAttributes = (attrs) =>
  Object.entries(attrs || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");

export const formatDateTime = (value) =>
  new Date(value).toLocaleString("en-LK", { dateStyle: "medium", timeStyle: "short" });

export const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-LK", { dateStyle: "medium" });
