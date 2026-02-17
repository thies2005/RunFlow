'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BarChart2 } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (_error: Error, _errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error?: Error;
}

/**
 * Error Boundary for chart components to prevent crashes from malformed data.
 * M-02: Gracefully handles Recharts errors and displays fallback UI.
 */
export class ChartErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Chart Error:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="glass-card p-6 h-64 flex flex-col items-center justify-center">
                    <BarChart2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-400">Unable to display chart</p>
                    <p className="text-sm text-gray-500 mt-2">
                        Try refreshing the page or syncing new data
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: undefined })}
                        className="mt-4 px-4 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
