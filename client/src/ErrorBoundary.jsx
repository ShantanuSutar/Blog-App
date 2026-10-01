import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import StatePanel from "./Components/ui/StatePanel.jsx";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="ui-container" style={{ paddingBlock: "var(--space-16)" }}>
          <StatePanel
            icon={AlertTriangle}
            tone="error"
            role="alert"
            title="Something went wrong"
            description="The page encountered an unexpected problem. Reload it to try again."
            action={<button className="ui-button--primary" type="button" onClick={() => window.location.reload()}><RotateCcw size={17} aria-hidden="true" /> Reload page</button>}
          />
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
