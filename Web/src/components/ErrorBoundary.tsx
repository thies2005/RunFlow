'use client';

import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    /** Optional name for identifying which component failed */
    componentName?: string;
    /** Whether to show retry button */
    showRetry?: boolean;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary for catching React rendering errors.
 * Particularly useful for wrapping chart components that may crash with malformed data.
 * 
 * @example
 * ```tsx
 * <ErrorBoundary componentName="VO2max Chart" showRetry>
 *     <LineChart data={chartData} />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // Log error for debugging (could be sent to error tracking service)
        console.error(`[ErrorBoundary${this.props.componentName ? `: ${this.props.componentName}` : ''}]`, error, errorInfo);
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        const { hasError, error } = this.state;
        const { children, fallback, componentName, showRetry = true } = this.props;

        if (hasError) {
            // Custom fallback if provided
            if (fallback) {
                return fallback;
            }

            // Default error UI
            return (
                <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                    <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
                    <h3 className="text-sm font-medium text-red-400 mb-1">
                        {componentName ? `${componentName} failed to load` : 'Something went wrong'}
                    </h3>
                    <p className="text-xs text-gray-500 mb-3 max-w-xs">
                        {error?.message || 'An unexpected error occurred while rendering this component.'}
                    </p>
                    {showRetry && (
                        <button
                            onClick={this.handleRetry}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Retry
                        </button>
                    )}
                </div>
            );
        }

        return children;
    }
}

/**
 * Chart-specific error boundary with minimal styling
 * Designed to match chart container dimensions
 */
export function ChartErrorBoundary({
    children,
    chartName
}: {
    children: ReactNode;
    chartName: string;
}): JSX.Element {
    return (
        <ErrorBoundary
            componentName={chartName}
            showRetry
            fallback={
                <div className="h-full min-h-[200px] flex items-center justify-center bg-gray-800/50 rounded-lg">
                    <div className="text-center">
                        <AlertCircle className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">
                            Unable to render {chartName}
                        </p>
                    </div>
                </div>
            }
        >
            {children}
        </ErrorBoundary>
    );
}

export default ErrorBoundary;
