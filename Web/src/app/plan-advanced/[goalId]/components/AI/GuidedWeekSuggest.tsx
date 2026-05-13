'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Check, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { addDays } from 'date-fns';
import type { PlanPhase } from '../Editor/PhaseSelector';

interface SuggestedWorkout {
    dayOffset: number;
    type: string;
    distanceM: number;
    description: string;
}

interface GuidedWeekSuggestProps {
    goalId: string;
    weekIndex: number;
    weekStartDate: Date;
    phase: PlanPhase;
    vdot: number;
    onApply: () => void;
    onClose: () => void;
}

const PHASE_TEMPLATES: Record<string, Array<{ type: string; dayOffset: number; distPctOfPeak: number }>> = {
    BASE: [
        { type: 'EASY', dayOffset: 0, distPctOfPeak: 0.35 },
        { type: 'EASY', dayOffset: 1, distPctOfPeak: 0.3 },
        { type: 'STRIDES', dayOffset: 2, distPctOfPeak: 0.25 },
        { type: 'EASY', dayOffset: 3, distPctOfPeak: 0.3 },
        { type: 'REST', dayOffset: 4, distPctOfPeak: 0 },
        { type: 'LONG_RUN', dayOffset: 5, distPctOfPeak: 0.5 },
        { type: 'EASY', dayOffset: 6, distPctOfPeak: 0.2 },
    ],
    BUILD: [
        { type: 'EASY', dayOffset: 0, distPctOfPeak: 0.3 },
        { type: 'INTERVALS', dayOffset: 1, distPctOfPeak: 0.35 },
        { type: 'EASY', dayOffset: 2, distPctOfPeak: 0.25 },
        { type: 'TEMPO', dayOffset: 3, distPctOfPeak: 0.4 },
        { type: 'REST', dayOffset: 4, distPctOfPeak: 0 },
        { type: 'LONG_RUN', dayOffset: 5, distPctOfPeak: 0.65 },
        { type: 'EASY', dayOffset: 6, distPctOfPeak: 0.2 },
    ],
    PEAK: [
        { type: 'EASY', dayOffset: 0, distPctOfPeak: 0.3 },
        { type: 'INTERVALS', dayOffset: 1, distPctOfPeak: 0.4 },
        { type: 'TEMPO', dayOffset: 2, distPctOfPeak: 0.35 },
        { type: 'EASY', dayOffset: 3, distPctOfPeak: 0.25 },
        { type: 'REST', dayOffset: 4, distPctOfPeak: 0 },
        { type: 'LONG_RUN', dayOffset: 5, distPctOfPeak: 0.75 },
        { type: 'EASY', dayOffset: 6, distPctOfPeak: 0.15 },
    ],
    TAPER: [
        { type: 'EASY', dayOffset: 0, distPctOfPeak: 0.25 },
        { type: 'STRIDES', dayOffset: 1, distPctOfPeak: 0.2 },
        { type: 'EASY', dayOffset: 2, distPctOfPeak: 0.2 },
        { type: 'TEMPO', dayOffset: 3, distPctOfPeak: 0.25 },
        { type: 'REST', dayOffset: 4, distPctOfPeak: 0 },
        { type: 'EASY', dayOffset: 5, distPctOfPeak: 0.3 },
        { type: 'REST', dayOffset: 6, distPctOfPeak: 0 },
    ],
    RACE_WEEK: [
        { type: 'REST', dayOffset: 0, distPctOfPeak: 0 },
        { type: 'STRIDES', dayOffset: 1, distPctOfPeak: 0.1 },
        { type: 'REST', dayOffset: 2, distPctOfPeak: 0 },
        { type: 'EASY', dayOffset: 3, distPctOfPeak: 0.15 },
        { type: 'REST', dayOffset: 4, distPctOfPeak: 0 },
        { type: 'REST', dayOffset: 5, distPctOfPeak: 0 },
        { type: 'RACE', dayOffset: 6, distPctOfPeak: 1 },
    ],
    RECOVERY: [
        { type: 'REST', dayOffset: 0, distPctOfPeak: 0 },
        { type: 'EASY', dayOffset: 1, distPctOfPeak: 0.2 },
        { type: 'REST', dayOffset: 2, distPctOfPeak: 0 },
        { type: 'EASY', dayOffset: 3, distPctOfPeak: 0.15 },
        { type: 'REST', dayOffset: 4, distPctOfPeak: 0 },
        { type: 'EASY', dayOffset: 5, distPctOfPeak: 0.2 },
        { type: 'REST', dayOffset: 6, distPctOfPeak: 0 },
    ],
    OFF: [],
};

function estimatePeakDistance(vdot: number): number {
    return Math.max(10000, vdot * 300);
}

export function GuidedWeekSuggest({ goalId, weekIndex, weekStartDate, phase, vdot, onApply, onClose }: GuidedWeekSuggestProps) {
    const queryClient = useQueryClient();
    const peakDist = useMemo(() => estimatePeakDistance(vdot), [vdot]);

    const suggestions = useMemo<SuggestedWorkout[]>(() => {
        const template = PHASE_TEMPLATES[phase] || PHASE_TEMPLATES.BASE;
        const weekFactor = Math.min(1, 0.5 + (weekIndex - 1) * 0.05);

        return template
            .filter((t) => t.type !== 'REST')
            .map((t) => ({
                dayOffset: t.dayOffset,
                type: t.type,
                distanceM: Math.round(t.distPctOfPeak * peakDist * weekFactor),
                description: `${t.type.charAt(0) + t.type.slice(1).toLowerCase()} — ${(t.distPctOfPeak * peakDist * weekFactor / 1000).toFixed(1)}km`,
            }));
    }, [phase, peakDist, weekIndex]);

    const applyMutation = useMutation({
        mutationFn: async () => {
            const responses: Response[] = [];
            for (const s of suggestions) {
                const date = addDays(weekStartDate, s.dayOffset);
                const res = await fetch(`/api/plan-advanced/${goalId}/workouts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        scheduledDate: date.toISOString(),
                        workoutType: s.type,
                        description: s.description,
                        targetDistance: s.distanceM,
                        targetDuration: null,
                        phase,
                    }),
                });
                if (!res.ok) throw new Error('Failed to create workout');
                responses.push(res);
            }
            return responses;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
            toast.success(`${suggestions.length} workouts added`);
            onApply();
        },
        onError: () => {
            toast.error('Failed to apply suggestion');
        },
    });

    const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <div className="mx-4 mb-2 rounded-lg border border-purple-500/20 bg-zinc-900 p-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Suggested Week {weekIndex} ({phase})
                </span>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
            <div className="space-y-1 mb-3">
                {suggestions.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                        <span className="text-zinc-500 w-8">{DAY_NAMES[s.dayOffset]}</span>
                        <span className="text-zinc-300">{s.type}</span>
                        <span className="text-zinc-500">
                            {s.distanceM >= 1000 ? `${(s.distanceM / 1000).toFixed(1)}km` : `${s.distanceM}m`}
                        </span>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => applyMutation.mutate()}
                    disabled={applyMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 transition-colors"
                >
                    {applyMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Check className="w-3.5 h-3.5" />
                    )}
                    Apply All
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-md text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
