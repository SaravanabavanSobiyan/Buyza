export const reportError = (error, context = {}) => {
  try {
    if (import.meta.env.DEV) console.error("[error]", error, context);
    else console.error("[error]", error?.message || error);
    window.__errorReporter?.(error, context);
  } catch {
    // Reporting must never throw.
  }
};
