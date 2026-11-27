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
import { installOverflowCheck } from "./utils/devOverflowCheck";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

installGlobalErrorHandlers();
installOverflowCheck();

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
