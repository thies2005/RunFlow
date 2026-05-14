'use client';

import { LayoutGrid, BarChart3, Lock } from 'lucide-react';

type ViewMode = 'calendar' | 'analysis';

interface ViewModeToggleProps {
    value: ViewMode;
    onChange: (mode: ViewMode) => void;
    isPremium?: boolean;
}

export function ViewModeToggle({ value, onChange, isPremium = false }: ViewModeToggleProps) {
    const modes: Array<{ key: ViewMode; label: string; icon: typeof LayoutGrid; premiumOnly: boolean }> = [
        { key: 'calendar', label: 'Calendar', icon: LayoutGrid, premiumOnly: false },
        { key: 'analysis', label: 'Analysis', icon: BarChart3, premiumOnly: true },
    ];

    return (
        <div className="flex items-center bg-zinc-900 rounded-md border border-zinc-800 p-0.5">
            {modes.map(({ key, label, icon: Icon, premiumOnly }) => {
                const locked = premiumOnly && !isPremium;
                return (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onChange(key)}
                        title={locked ? 'Upgrade to premium to access AI plan analysis' : label}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            value === key
                                ? 'bg-zinc-700 text-zinc-100'
                                : locked
                                    ? 'text-zinc-700 cursor-not-allowed'
                                    : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        {locked ? <Lock className="w-3 h-3" /> : <Icon className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{label}</span>
                    </button>
                );
            })}
        </div>
    );
}
