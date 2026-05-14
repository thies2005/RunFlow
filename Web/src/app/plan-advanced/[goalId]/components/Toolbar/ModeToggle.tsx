'use client';

import { GraduationCap, Wrench, Sparkles, Lock } from 'lucide-react';
import type { PlanCreationMode } from '../../hooks/usePlanMode';

interface ModeToggleProps {
    mode: PlanCreationMode;
    onModeChange: (mode: PlanCreationMode) => void;
    isPremium?: boolean;
}

const MODES: Array<{
    key: PlanCreationMode;
    label: string;
    shortLabel: string;
    icon: typeof Wrench;
    premiumOnly: boolean;
}> = [
    { key: 'EXPERT_MANUAL', label: 'Manual', shortLabel: 'Manual', icon: Wrench, premiumOnly: false },
    { key: 'GUIDED', label: 'Guided', shortLabel: 'Guided', icon: GraduationCap, premiumOnly: false },
    { key: 'AI_ASSISTED', label: 'AI-Assisted', shortLabel: 'AI', icon: Sparkles, premiumOnly: true },
];

export function ModeToggle({ mode, onModeChange, isPremium = false }: ModeToggleProps) {
    return (
        <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wide font-medium hidden lg:inline">Mode</span>
            <div className="flex items-center bg-zinc-900 rounded-lg border border-zinc-800 p-0.5">
                {MODES.map(({ key, label, shortLabel, icon: Icon, premiumOnly }) => {
                    const locked = premiumOnly && !isPremium;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => !locked && onModeChange(key)}
                            title={locked ? 'Upgrade to premium to use AI-Assisted mode' : label}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                locked
                                    ? 'text-zinc-700 cursor-not-allowed'
                                    : mode === key
                                        ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                            }`}
                        >
                            {locked ? <Lock className="w-3 h-3" /> : <Icon className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{label}</span>
                            <span className="sm:hidden">{shortLabel}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
