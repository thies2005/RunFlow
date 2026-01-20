'use client';

import { useEffect } from 'react';

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
            <div className="max-w-md w-full bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
                <h2 className="text-xl font-bold text-red-500 mb-2">Something went wrong!</h2>
                <p className="text-gray-400 mb-6 text-sm">{error.message || 'An unexpected error occurred.'}</p>
                <button
                    onClick={() => reset()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
