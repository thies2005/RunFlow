'use client';

import { GraduationCap, X, Lightbulb } from 'lucide-react';

interface GuidedTipAction {
    label: string;
    onClick: () => void;
}

interface GuidedTipCardProps {
    type: string;
    title: string;
    body: string;
    actions?: GuidedTipAction[];
    onDismiss: () => void;
}

export function GuidedTipCard({ type, title, body, actions, onDismiss }: GuidedTipCardProps) {
    const icon = type === 'tip' ? <Lightbulb className="w-4 h-4 text-blue-400" /> : <GraduationCap className="w-4 h-4 text-purple-400" />;

    return (
        <div className="mx-4 mb-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
            <div className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0">{icon}</div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-blue-300">{title}</h4>
                    <p className="text-[11px] text-foreground-secondary mt-1 leading-relaxed whitespace-pre-line">{body}</p>
                    {actions && actions.length > 0 && (
                        <div className="flex items-center gap-2 mt-2.5">
                            {actions.map((action) => (
                                <button
                                    key={action.label}
                                    type="button"
                                    onClick={action.onClick}
                                    className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-500/20 transition-colors"
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="shrink-0 p-1 rounded text-foreground-muted hover:text-foreground-secondary hover:bg-background-tertiary/50 transition-colors"
                    title="Dismiss"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
