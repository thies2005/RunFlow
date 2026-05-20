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
        <div className="border border-zinc-800 bg-zinc-900 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-zinc-300">{title}</h3>
                {tooltip && (
                    <div className="relative">
                        <button
                            type="button"
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                            className="p-0.5 text-zinc-600 hover:text-zinc-400 transition-colors"
                        >
                            <Info className="w-3.5 h-3.5" />
                        </button>
                        {showTooltip && (
                            <div className="absolute left-0 top-full mt-1 z-50 w-56 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 shadow-xl">
                                {tooltip}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {isEmpty ? (
                <div className="flex items-center justify-center py-10 text-zinc-600 text-sm">
                    {emptyMessage || 'No data available'}
                </div>
            ) : (
                children
            )}
        </div>
    );
}
