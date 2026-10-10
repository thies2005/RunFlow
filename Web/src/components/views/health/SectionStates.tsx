import { AlertCircle, Loader2 } from 'lucide-react';

export function SectionLoadingCard({ label }: { label: string }) {
    return (
        <div className="glass-card p-5 flex items-center justify-center gap-3 text-sm text-foreground-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{label}</span>
        </div>
    );
}

export function SectionErrorCard({
    title,
    message,
    onRetry,
}: {
    title: string;
    message: string;
    onRetry?: () => void;
}) {
    return (
        <div className="glass-card border-negative/20 bg-negative/5 p-4">
            <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-negative shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm font-semibold text-negative">{title}</p>
                    <p className="text-xs text-foreground-muted mt-1">{message}</p>
                    {onRetry && (
                        <button
                            type="button"
                            onClick={onRetry}
                            className="mt-3 text-xs font-semibold text-negative bg-negative/10 border border-negative/20 px-3 py-1.5 rounded-md hover:bg-negative/20 transition-colors"
                        >
                            Retry
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
