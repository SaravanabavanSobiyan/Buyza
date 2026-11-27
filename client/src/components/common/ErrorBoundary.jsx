import { Component } from "react";
import ErrorFallback from "./ErrorFallback";
import { reportError } from "../../utils/reportError";

const changed = (a = [], b = []) =>
  a.length !== b.length || a.some((value, i) => !Object.is(value, b[i]));

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportError(error, {
      boundary: this.props.name || "unnamed",
      componentStack: info?.componentStack,
    });
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      this.state.error !== null &&
      prevState.error !== null &&
      changed(prevProps.resetKeys, this.props.resetKeys)
    ) {
      this.reset();
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error !== null) {
      const Fallback = this.props.fallback || ErrorFallback;
      return <Fallback error={this.state.error} reset={this.reset} />;
    }
    return this.props.children;
  }
}
