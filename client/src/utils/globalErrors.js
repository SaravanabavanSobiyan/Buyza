import { reportError } from "./reportError";
import { reloadOnce } from "./lazyWithRetry";

export const installGlobalErrorHandlers = () => {
  window.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason, { type: "unhandledrejection" });
  });
  window.addEventListener("error", (event) => {
    if (!event.error) return;
    reportError(event.error, { type: "window.error" });
  });
  window.addEventListener("vite:preloadError", (event) => {
    if (navigator.onLine && reloadOnce()) event.preventDefault();
  });
};
