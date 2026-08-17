'use client';

import { useMemo } from 'react';
import type { PaceProfilePhase } from '../Progression/types';

interface PaceTimelineProps {
    profiles: PaceProfilePhase[];
    planWeeks: number;
}

const PACE_COLORS: Record<string, string> = {
    easy: 'bg-blue-400',
    tempo: 'bg-orange-400',
    interval: 'bg-red-400',
    repetition: 'bg-yellow-400',
    longRun: 'bg-green-400',
};

const PACE_KEYS: Array<{ key: keyof PaceProfilePhase; label: string; paceKey: string }> = [
    { key: 'easyPace' as keyof PaceProfilePhase, label: 'Easy', paceKey: 'easy' },
    { key: 'tempoPace' as keyof PaceProfilePhase, label: 'Tempo', paceKey: 'tempo' },
    { key: 'intervalPace' as keyof PaceProfilePhase, label: 'Interval', paceKey: 'interval' },
    { key: 'repetitionPace' as keyof PaceProfilePhase, label: 'Rep', paceKey: 'repetition' },
    { key: 'longRunPace' as keyof PaceProfilePhase, label: 'Long', paceKey: 'longRun' },
];

function getPaceMid(phase: PaceProfilePhase, key: keyof PaceProfilePhase): number | null {
    const pace = phase[key] as { min: number; max: number } | null;
    if (!pace || pace.min <= 0 || pace.max <= 0) return null;
    return (pace.min + pace.max) / 2;
}

function Sparkline({ values, color }: { values: (number | null)[]; color: string }) {
    if (values.length < 2) return null;
    const validValues = values.filter((v): v is number => v !== null);
    if (validValues.length < 2) return null;

    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    const range = max - min || 1;
    const width = 60;
    const height = 16;

    const points = values
        .map((v, i) => {
            if (v === null) return null;
            const x = (i / (values.length - 1)) * width;
            const y = height - ((v - min) / range) * height;
            return `${x},${y}`;
        })
        .filter((p): p is string => p !== null)
        .join(' ');

    return (
        <svg width={width} height={height} className="inline-block">
            <polyline
                points={points}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className={color}
            />
        </svg>
    );
}

export function PaceTimeline({ profiles, planWeeks }: PaceTimelineProps) {
    const { maxWeek } = useMemo(() => {
        const maxW = profiles.length > 0 ? Math.max(...profiles.map((p) => p.endWeek)) : planWeeks;
        return { maxWeek: Math.max(maxW, planWeeks, 1) };
    }, [profiles, planWeeks]);

    const weekMap = useMemo(() => {
        const map = new Map<number, PaceProfilePhase>();
        for (const p of profiles) {
            for (let w = p.startWeek; w <= p.endWeek; w++) {
                map.set(w, p);
            }
        }
        return map;
    }, [profiles]);

    if (profiles.length === 0) return null;

    return (
        <div className="space-y-2">
            <div className="flex items-end gap-0.5 overflow-x-auto pb-1">
                {Array.from({ length: maxWeek }, (_, i) => i + 1).map((week) => {
                    const phase = weekMap.get(week);
                    const hasAdjustment = phase && phase.vdotAdjustment !== 0;

                    return (
                        <div
                            key={week}
                            className={`flex flex-col items-center min-w-[8px] ${
                                hasAdjustment ? 'border-l border-dashed border-foreground/20 pl-0.5 ml-0.5' : ''
                            }`}
                            title={
                                phase
                                    ? `${phase.phaseName} (Week ${week}) VDOT ${phase.vdotAdjustment > 0 ? '+' : ''}${phase.vdotAdjustment.toFixed(1)}`
                                    : `Week ${week}`
                            }
                        >
                            <div className="w-2 h-8 bg-background-tertiary rounded-sm" />
                            <span className="text-[7px] text-foreground-muted mt-0.5">{week}</span>
                        </div>
                    );
                })}
            </div>

            <div className="space-y-1">
                {PACE_KEYS.map(({ key, label, paceKey }) => {
                    const values = Array.from({ length: maxWeek }, (_, i) => {
                        const phase = weekMap.get(i + 1);
                        return phase ? getPaceMid(phase, key) : null;
                    });

                    return (
                        <div key={paceKey} className="flex items-center gap-2">
                            <span className="text-[9px] text-foreground-muted w-14">{label}</span>
                            <Sparkline values={values} color={PACE_COLORS[paceKey] || 'text-foreground-secondary'} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
