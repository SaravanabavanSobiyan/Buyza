import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { store } from "./store";
import App from "./App";
import ErrorBoundary from "./components/common/ErrorBoundary";
import ErrorFallback from "./components/common/ErrorFallback";
import { HelmetProvider } from "react-helmet-async";
import { installGlobalErrorHandlers } from "./utils/globalErrors";
import { initializeErrorReporting } from "./utils/initErrorReporting";
import { installOverflowCheck } from "./utils/devOverflowCheck";
import "./index.css";

const apiOrigin = new URL(import.meta.env.VITE_API_URL || "/api", window.location.origin).origin;
if (apiOrigin !== window.location.origin) {
  const apiPreconnect = document.createElement("link");
  apiPreconnect.rel = "preconnect";
  apiPreconnect.href = apiOrigin;
  apiPreconnect.crossOrigin = "use-credentials";
  document.head.append(apiPreconnect);
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

installGlobalErrorHandlers();
installOverflowCheck();
initializeErrorReporting().catch((error) =>
  console.error("[sentry] error reporting could not be initialized:", error.message)
);

const AppFallback = (props) => <ErrorFallback {...props} fullScreen />;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary name="app" fallback={AppFallback}>
      <HelmetProvider>
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </QueryClientProvider>
        </Provider>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
