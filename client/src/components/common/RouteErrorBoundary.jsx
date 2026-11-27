import { useLocation } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";

export default function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary name="route" resetKeys={[pathname]}>
      {children}
    </ErrorBoundary>
  );
}
