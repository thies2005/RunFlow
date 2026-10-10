"use client";

export default function OfflinePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
            <h1 className="text-4xl font-bold mb-4">You are offline</h1>
            <p className="text-foreground-muted mb-8">
                It looks like you lost your internet connection.
                <br />
                You can still view pages you have visited previously.
            </p>
            <button
                onClick={() => window.location.reload()}
                className="btn-primary"
            >
                Try Again
            </button>
        </div>
    );
}
