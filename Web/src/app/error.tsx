'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="glass-card max-w-md w-full p-8 text-center animate-slide-in">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-foreground mb-3">Something Went Wrong</h2>
                <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                    An unexpected error occurred. Please try again.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => reset()}
                        className="btn-primary w-full"
                    >
                        Try Again
                    </button>
                    <Link
                        href="/"
                        className="btn-secondary w-full inline-block text-center"
                    >
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
