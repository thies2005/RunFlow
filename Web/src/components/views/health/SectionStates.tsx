import { AlertCircle, Loader2 } from 'lucide-react';

export function SectionLoadingCard({ label }: { label: string }) {
    return (
        <div className="glass-card border border-glass-border rounded-2xl p-5 flex items-center justify-center gap-3 text-sm text-gray-400">
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
        <div className="glass-card border border-red-500/20 bg-red-500/5 rounded-2xl p-4">
            <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm font-semibold text-red-300">{title}</p>
                    <p className="text-xs text-red-200/80 mt-1">{message}</p>
                    {onRetry && (
                        <button
                            type="button"
                            onClick={onRetry}
                            className="mt-3 text-xs font-semibold text-red-200 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                        >
                            Retry
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
