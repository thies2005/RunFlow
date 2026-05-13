'use client';

import { AlertTriangle, Info, Sparkles, X } from 'lucide-react';

interface AiSuggestionCardProps {
    type: 'warning' | 'info';
    title: string;
    body: string;
    applyAction: () => void;
    onDismiss: () => void;
}

export function AiSuggestionCard({ type, title, body, applyAction, onDismiss }: AiSuggestionCardProps) {
    const isWarning = type === 'warning';

    return (
        <div
            className={`mx-4 mb-2 rounded-lg border p-3 ${
                isWarning
                    ? 'border-amber-500/20 bg-amber-500/5'
                    : 'border-blue-500/20 bg-blue-500/5'
            }`}
        >
            <div className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0">
                    {isWarning ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                        <Info className="w-4 h-4 text-blue-400" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        {title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{body}</p>
                    <div className="flex items-center gap-2 mt-2.5">
                        <button
                            type="button"
                            onClick={applyAction}
                            className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-purple-600 text-white hover:bg-purple-500 transition-colors"
                        >
                            Apply
                        </button>
                        <button
                            type="button"
                            onClick={onDismiss}
                            className="px-2.5 py-1 rounded-md text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="shrink-0 p-1 rounded text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-colors"
                    title="Dismiss"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
