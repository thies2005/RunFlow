'use client';

import { useState, ReactNode } from 'react';
import { Info } from 'lucide-react';

interface ChartCardProps {
    title: string;
    tooltip?: string;
    children: ReactNode;
    emptyMessage?: string;
    isEmpty?: boolean;
}

export function ChartCard({ title, tooltip, children, emptyMessage, isEmpty }: ChartCardProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div className="border border-glass-border bg-background-secondary rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-foreground-secondary">{title}</h3>
                {tooltip && (
                    <div className="relative">
                        <button
                            type="button"
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                            className="p-0.5 text-foreground-muted hover:text-foreground-secondary transition-colors"
                        >
                            <Info className="w-3.5 h-3.5" />
                        </button>
                        {showTooltip && (
                            <div className="absolute left-0 top-full mt-1 z-50 w-56 px-3 py-2 rounded-lg bg-background-tertiary border border-foreground/20 text-xs text-foreground-secondary shadow-xl">
                                {tooltip}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {isEmpty ? (
                <div className="flex items-center justify-center py-10 text-foreground-muted text-sm">
                    {emptyMessage || 'No data available'}
                </div>
            ) : (
                children
            )}
        </div>
    );
}
