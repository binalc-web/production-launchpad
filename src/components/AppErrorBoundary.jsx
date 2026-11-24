import React from "react";
import { Button } from "@/components/ui/button";
import { captureFrontendException } from "@/lib/sentry";
import { logger } from "@/utils/logger";

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error, info) {
    logger.error("react_error_boundary", error, info?.componentStack);
    captureFrontendException(error, {
      extra: { componentStack: info?.componentStack },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Please refresh the page. If the problem continues, contact support.
          </p>
          {import.meta.env.DEV && this.state.errorMessage ? (
            <p className="max-w-lg font-mono text-xs text-destructive">{this.state.errorMessage}</p>
          ) : null}
          <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
