const safeUrl = (value) => {
  try {
    const url = new URL(value, window.location.origin);
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(/\/reset-password\/[^/]+/i, "/reset-password/[redacted]");
    return url.origin === window.location.origin ? url.pathname : `${url.origin}${url.pathname}`;
  } catch {
    return undefined;
  }
};

const safeContext = (context) => {
  const url = typeof context.url === "string" ? safeUrl(context.url) : undefined;
  return {
    ...(typeof context.type === "string" && { type: context.type }),
    ...(typeof context.status === "number" && { status: context.status }),
    ...(url && { url }),
  };
};

export async function initializeErrorReporting() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  const Sentry = await import("@sentry/browser");
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.request) {
        if (typeof event.request.url === "string") event.request.url = safeUrl(event.request.url);
        delete event.request.cookies;
        delete event.request.data;
        if (event.request.headers) {
          for (const header of Object.keys(event.request.headers)) {
            if (/authorization|cookie|set-cookie/i.test(header)) delete event.request.headers[header];
          }
        }
      }
      return event;
    },
  });
  window.__errorReporter = (error, context = {}) =>
    Sentry.captureException(error, { extra: safeContext(context) });
}
