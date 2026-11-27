import { lazy } from "react";

const CHUNK_ERROR =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk [\w-]+ failed|Unable to preload CSS/i;

export const isChunkError = (error) => {
  if (error?.isOfflineChunkError) return false;
  if (typeof error?.isChunkError === "boolean") return error.isChunkError;
  return CHUNK_ERROR.test(String(error?.message ?? error ?? ""));
};

const KEY = "chunk_reload_at";
const WINDOW_MS = 10_000;
const fallbackStore = (() => {
  const map = new Map();
  return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
})();

const defaultStorage = () => {
  try {
    const storage = window.sessionStorage;
    storage.getItem(KEY);
    return storage;
  } catch {
    return fallbackStore;
  }
};

export const reloadOnce = ({
  reload = () => window.location.reload(),
  now = Date.now,
  storage = defaultStorage(),
} = {}) => {
  const last = Number(storage.getItem(KEY) || 0);
  if (now() - last < WINDOW_MS) return false;
  storage.setItem(KEY, String(now()));
  reload();
  return true;
};

export const loadWithRetry = async (importer, options) => {
  try {
    return await importer();
  } catch (error) {
    if (isChunkError(error)) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const offlineError = error instanceof Error ? error : new Error(String(error));
        offlineError.isOfflineChunkError = true;
        throw offlineError;
      }
      if (reloadOnce(options)) return new Promise(() => {});
      const chunkError = error instanceof Error ? error : new Error(String(error));
      chunkError.isChunkError = true;
      throw chunkError;
    }
    throw error;
  }
};

export const lazyWithRetry = (importer) => lazy(() => loadWithRetry(importer));
