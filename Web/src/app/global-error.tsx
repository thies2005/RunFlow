'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
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
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    backgroundColor: '#0a0a0a',
                    color: '#ffffff',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
            >
                <div
                    style={{
                        maxWidth: '28rem',
                        width: '100%',
                        padding: '2rem',
                        textAlign: 'center',
                        borderRadius: '0.75rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                >
                    <div
                        style={{
                            width: '5rem',
                            height: '5rem',
                            borderRadius: '9999px',
                            margin: '0 auto 1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(to bottom right, rgba(239,68,68,0.2), rgba(249,115,22,0.2))',
                        }}
                    >
                        <AlertTriangle size={40} color="#ef4444" />
                    </div>

                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                        Something Went Wrong
                    </h1>
                    <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                        An unexpected application error occurred. Please try again.
                    </p>

                    <button
                        onClick={() => reset()}
                        style={{
                            width: '100%',
                            padding: '0.625rem 1rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 500,
                            color: '#ffffff',
                            backgroundColor: '#f97316',
                        }}
                    >
                        Try Again
                    </button>
                </div>
            </body>
        </html>
    );
}
