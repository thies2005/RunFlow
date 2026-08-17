'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export type PlanPhase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RACE_WEEK' | 'RECOVERY' | 'OFF';

const PHASES: PlanPhase[] = ['BASE', 'BUILD', 'PEAK', 'TAPER', 'RACE_WEEK', 'RECOVERY', 'OFF'];

const PHASE_COLORS: Record<PlanPhase, string> = {
    BASE: 'bg-blue-500/20 text-blue-400',
    BUILD: 'bg-orange-500/20 text-orange-400',
    PEAK: 'bg-purple-500/20 text-purple-400',
    TAPER: 'bg-cyan-500/20 text-cyan-400',
    RACE_WEEK: 'bg-green-500/20 text-green-400',
    RECOVERY: 'bg-teal-500/20 text-teal-400',
    OFF: 'bg-foreground/20 text-foreground-secondary',
};

interface PhaseSelectorProps {
    currentPhase: PlanPhase;
    goalId: string;
    weekIndex: number;
    onPhaseChange: (phase: PlanPhase) => void;
}

export function PhaseSelector({ currentPhase, goalId, weekIndex, onPhaseChange }: PhaseSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (phase: PlanPhase) => {
        setIsOpen(false);
        onPhaseChange(phase);
    };

    const color = PHASE_COLORS[currentPhase] || PHASE_COLORS.OFF;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border transition-colors ${color}`}
            >
                {currentPhase}
                <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            {isOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-background-secondary border border-foreground/20 rounded-lg shadow-xl py-1 min-w-[120px]">
                    {PHASES.map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => handleSelect(p)}
                            className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                                p === currentPhase
                                    ? 'text-foreground bg-background-tertiary'
                                    : 'text-foreground-secondary hover:text-foreground hover:bg-background-tertiary/60'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
