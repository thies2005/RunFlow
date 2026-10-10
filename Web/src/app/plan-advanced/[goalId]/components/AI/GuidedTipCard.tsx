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
    const icon = type === 'tip' ? <Lightbulb className="w-4 h-4 text-accent-blue" /> : <GraduationCap className="w-4 h-4 text-workout-long-run" />;

    return (
        <div className="mx-4 mb-2 rounded-md border border-accent-blue/30 bg-accent-blue/5 p-3">
            <div className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0">{icon}</div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-accent-blue">{title}</h4>
                    <p className="text-[11px] text-foreground-secondary mt-1 leading-relaxed whitespace-pre-line">{body}</p>
                    {actions && actions.length > 0 && (
                        <div className="flex items-center gap-2 mt-2.5">
                            {actions.map((action) => (
                                <button
                                    key={action.label}
                                    type="button"
                                    onClick={action.onClick}
                                    className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-accent-blue/15 text-accent-blue hover:bg-accent-blue/15 border border-accent-blue/30 transition-colors"
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
                    className="shrink-0 p-1 rounded text-foreground-muted hover:text-foreground-secondary hover:bg-background-tertiary transition-colors"
                    title="Dismiss"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
