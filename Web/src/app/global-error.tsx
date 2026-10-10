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
                    backgroundColor: '#16181a',
                    color: '#f6f7f5',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
            >
                <div
                    style={{
                        maxWidth: '28rem',
                        width: '100%',
                        padding: '2rem',
                        textAlign: 'center',
                        borderRadius: '6px',
                        backgroundColor: '#1a1d21',
                        border: '1px solid #2a2d31',
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
                            background: '#22262b',
                            border: '1px solid #2a2d31',
                        }}
                    >
                        <AlertTriangle size={40} color="#e06552" />
                    </div>

                    <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                        Something Went Wrong
                    </h1>
                    <p style={{ color: '#a6aba5', fontSize: '0.875rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                        An unexpected application error occurred. Please try again.
                    </p>

                    <button
                        onClick={() => reset()}
                        style={{
                            width: '100%',
                            padding: '0.625rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                            color: '#ffffff',
                            backgroundColor: '#e8501a',
                        }}
                    >
                        Try Again
                    </button>
                </div>
            </body>
        </html>
    );
}
