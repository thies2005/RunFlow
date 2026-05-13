'use client';

import { LayoutGrid, BarChart3 } from 'lucide-react';

type ViewMode = 'calendar' | 'analysis';

interface ViewModeToggleProps {
    value: ViewMode;
    onChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
    const modes: Array<{ key: ViewMode; label: string; icon: typeof LayoutGrid }> = [
        { key: 'calendar', label: 'Calendar', icon: LayoutGrid },
        { key: 'analysis', label: 'Analysis', icon: BarChart3 },
    ];

    return (
        <div className="flex items-center bg-zinc-900 rounded-md border border-zinc-800 p-0.5">
            {modes.map(({ key, label, icon: Icon }) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => onChange(key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        value === key
                            ? 'bg-zinc-700 text-zinc-100'
                            : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                </button>
            ))}
        </div>
    );
}
