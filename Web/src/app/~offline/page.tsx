"use client";

export default function OfflinePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
            <h1 className="text-4xl font-bold mb-4">You are offline</h1>
            <p className="text-muted-foreground mb-8">
                It looks like you lost your internet connection.
                <br />
                You can still view pages you have visited previously.
            </p>
            <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
                Try Again
            </button>
        </div>
    );
}
