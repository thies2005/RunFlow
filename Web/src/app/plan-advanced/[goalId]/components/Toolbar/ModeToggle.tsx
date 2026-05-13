'use client';

import { GraduationCap, Wrench, Sparkles } from 'lucide-react';
import type { PlanCreationMode } from '../../hooks/usePlanMode';

interface ModeToggleProps {
    mode: PlanCreationMode;
    onModeChange: (mode: PlanCreationMode) => void;
}

const MODES: Array<{
    key: PlanCreationMode;
    label: string;
    shortLabel: string;
    icon: typeof Wrench;
}> = [
    { key: 'EXPERT_MANUAL', label: 'Expert Manual', shortLabel: 'Expert', icon: Wrench },
    { key: 'GUIDED', label: 'Guided', shortLabel: 'Guided', icon: GraduationCap },
    { key: 'AI_ASSISTED', label: 'AI-Assisted', shortLabel: 'AI', icon: Sparkles },
];

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
    return (
        <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wide font-medium hidden lg:inline">Mode</span>
            <div className="flex items-center bg-zinc-900 rounded-lg border border-zinc-800 p-0.5">
                {MODES.map(({ key, label, shortLabel, icon: Icon }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onModeChange(key)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                            mode === key
                                ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                        }`}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{label}</span>
                        <span className="sm:hidden">{shortLabel}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
