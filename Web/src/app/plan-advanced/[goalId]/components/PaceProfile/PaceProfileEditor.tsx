'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, RotateCcw } from 'lucide-react';
import { calculateTrainingPaces, formatPace } from '@/lib/metrics/vdot';
import { HrZoneEditor } from './HrZoneEditor';
import { PaceTimeline } from './PaceTimeline';
import type { PaceProfilePhase, PlanPaceProfile } from '../Progression/types';

const DEFAULT_HR_ZONES = [128, 142, 155, 168, 181, 194];

interface PaceProfileEditorProps {
    goalId: string;
    baseVdot: number;
    profile?: PlanPaceProfile;
}

function paceRangeFromSec(min: number, max: number): string {
    return `${formatPace(min)} - ${formatPace(max)}`;
}

export function PaceProfileEditor({ goalId, baseVdot, profile }: PaceProfileEditorProps) {
    const queryClient = useQueryClient();

    const basePaces = calculateTrainingPaces(baseVdot);

    const [phases, setPhases] = useState<PaceProfilePhase[]>(
        profile?.profiles || [
            {
                phaseName: 'BASE',
                phaseOrder: 1,
                startWeek: 1,
                endWeek: 4,
                vdotAdjustment: 0,
                easyPace: { min: basePaces.easy.min, max: basePaces.easy.max },
                tempoPace: { min: basePaces.threshold - 10, max: basePaces.threshold + 10 },
                intervalPace: { min: basePaces.interval - 5, max: basePaces.interval + 5 },
                repetitionPace: { min: basePaces.repetition - 5, max: basePaces.repetition + 5 },
                longRunPace: { min: basePaces.easy.min - 10, max: basePaces.easy.max + 10 },
                hrZones: null,
            },
        ],
    );

    const [expandedPhase, setExpandedPhase] = useState<string | null>(phases[0]?.phaseName || null);

    const updatePhase = useCallback((index: number, updates: Partial<PaceProfilePhase>) => {
        setPhases((prev) =>
            prev.map((p, i) => (i === index ? { ...p, ...updates } : p)),
        );
    }, []);

    const autoFillPhase = useCallback(
        (index: number) => {
            const phase = phases[index];
            const adjustedVdot = baseVdot + phase.vdotAdjustment;
            const paces = calculateTrainingPaces(adjustedVdot);

            updatePhase(index, {
                easyPace: { min: paces.easy.min, max: paces.easy.max },
                tempoPace: { min: paces.threshold - 10, max: paces.threshold + 10 },
                intervalPace: { min: paces.interval - 5, max: paces.interval + 5 },
                repetitionPace: { min: paces.repetition - 5, max: paces.repetition + 5 },
                longRunPace: { min: paces.easy.min - 10, max: paces.easy.max + 10 },
            });
        },
        [baseVdot, phases, updatePhase],
    );

    const autoFillAll = useCallback(() => {
        setPhases((prev) =>
            prev.map((phase) => {
                const adjustedVdot = baseVdot + phase.vdotAdjustment;
                const paces = calculateTrainingPaces(adjustedVdot);
                return {
                    ...phase,
                    easyPace: { min: paces.easy.min, max: paces.easy.max },
                    tempoPace: { min: paces.threshold - 10, max: paces.threshold + 10 },
                    intervalPace: { min: paces.interval - 5, max: paces.interval + 5 },
                    repetitionPace: { min: paces.repetition - 5, max: paces.repetition + 5 },
                    longRunPace: { min: paces.easy.min - 10, max: paces.easy.max + 10 },
                };
            }),
        );
    }, [baseVdot]);

    const handleHrZoneChange = useCallback((phaseName: string, zones: number[]) => {
        setPhases((prev) =>
            prev.map((p) => (p.phaseName === phaseName ? { ...p, hrZones: zones } : p)),
        );
    }, []);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/plan-advanced/${goalId}/pace-profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ baseVdot, profiles: phases }),
            });
            if (!res.ok) throw new Error('Save failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
        },
    });

    const totalWeeks = phases.length > 0
        ? Math.max(...phases.map((p) => p.endWeek))
        : 0;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Pace Profile</h3>
                    <p className="text-[10px] text-foreground-muted">Base VDOT: {baseVdot}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={autoFillAll}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] text-foreground-secondary hover:text-foreground hover:bg-background-tertiary transition-colors"
                    >
                        <RotateCcw className="w-3 h-3" />
                        Auto-fill all from VDOT
                    </button>
                    <button
                        type="button"
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs hover:bg-blue-500 disabled:opacity-50 transition-colors"
                    >
                        {saveMutation.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <Save className="w-3 h-3" />
                        )}
                        Save
                    </button>
                </div>
            </div>

            <PaceTimeline profiles={phases} planWeeks={totalWeeks} />

            <div className="space-y-2">
                {phases.map((phase, index) => {
                    const isExpanded = expandedPhase === phase.phaseName;

                    return (
                        <div key={phase.phaseName} className="bg-background-secondary border border-glass-border rounded-lg overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setExpandedPhase(isExpanded ? null : phase.phaseName)}
                                className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-foreground">{phase.phaseName}</span>
                                    <span className="text-[10px] text-foreground-muted">
                                        Weeks {phase.startWeek}-{phase.endWeek}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-mono ${
                                        phase.vdotAdjustment > 0 ? 'text-green-400' : phase.vdotAdjustment < 0 ? 'text-red-400' : 'text-foreground-muted'
                                    }`}>
                                        VDOT {phase.vdotAdjustment > 0 ? '+' : ''}{phase.vdotAdjustment.toFixed(1)}
                                    </span>
                                    <svg
                                        className={`w-4 h-4 text-foreground-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="px-3 pb-3 space-y-3 border-t border-glass-border">
                                    <div className="pt-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[10px] text-foreground-secondary">VDOT Adjustment</label>
                                            <button
                                                type="button"
                                                onClick={() => autoFillPhase(index)}
                                                className="text-[10px] text-foreground-muted hover:text-foreground-secondary transition-colors"
                                            >
                                                Auto-fill from VDOT
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="range"
                                                min={-2.0}
                                                max={2.0}
                                                step={0.1}
                                                value={phase.vdotAdjustment}
                                                onChange={(e) =>
                                                    updatePhase(index, {
                                                        vdotAdjustment: parseFloat(e.target.value),
                                                    })
                                                }
                                                className="flex-1 accent-blue-500"
                                            />
                                            <span className="text-xs font-mono text-foreground-secondary w-12 text-right">
                                                {phase.vdotAdjustment > 0 ? '+' : ''}{phase.vdotAdjustment.toFixed(1)}
                                            </span>
                                        </div>
                                    </div>

                                    <PaceRow label="Easy" color="text-blue-400" pace={phase.easyPace} phaseIndex={index} field="easyPace" updatePhase={updatePhase} />
                                    <PaceRow label="Tempo" color="text-orange-400" pace={phase.tempoPace} phaseIndex={index} field="tempoPace" updatePhase={updatePhase} />
                                    <PaceRow label="Interval" color="text-red-400" pace={phase.intervalPace} phaseIndex={index} field="intervalPace" updatePhase={updatePhase} />
                                    <PaceRow label="Repetition" color="text-yellow-400" pace={phase.repetitionPace} phaseIndex={index} field="repetitionPace" updatePhase={updatePhase} />
                                    <PaceRow label="Long Run" color="text-green-400" pace={phase.longRunPace} phaseIndex={index} field="longRunPace" updatePhase={updatePhase} />

                                    <div className="border-t border-glass-border pt-2">
                                        <HrZoneEditor
                                            defaultZones={DEFAULT_HR_ZONES}
                                            overrides={Object.fromEntries(
                                                phases.map((p) => [p.phaseName, p.hrZones || DEFAULT_HR_ZONES]),
                                            )}
                                            onChange={handleHrZoneChange}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function PaceRow({
    label,
    color,
    pace,
    phaseIndex,
    field,
    updatePhase,
}: {
    label: string;
    color: string;
    pace: { min: number; max: number } | null;
    phaseIndex: number;
    field: string;
    updatePhase: (index: number, updates: Partial<PaceProfilePhase>) => void;
}) {
    return (
        <div className="flex items-center gap-2">
            <span className={`text-[10px] w-20 ${color}`}>{label}</span>
            <input
                type="number"
                min={180}
                max={600}
                value={pace?.min ?? ''}
                onChange={(e) =>
                    updatePhase(phaseIndex, {
                        [field]: { min: Number(e.target.value), max: pace?.max ?? 0 },
                    })
                }
                className="w-16 bg-background-tertiary border border-foreground/20 rounded px-1.5 py-0.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                placeholder="min"
            />
            <span className="text-[10px] text-foreground-muted">-</span>
            <input
                type="number"
                min={180}
                max={600}
                value={pace?.max ?? ''}
                onChange={(e) =>
                    updatePhase(phaseIndex, {
                        [field]: { min: pace?.min ?? 0, max: Number(e.target.value) },
                    })
                }
                className="w-16 bg-background-tertiary border border-foreground/20 rounded px-1.5 py-0.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                placeholder="max"
            />
            <span className="text-[10px] text-foreground-muted">sec/km</span>
            {pace && pace.min > 0 && pace.max > 0 && (
                <span className="text-[10px] text-foreground-muted ml-auto">
                    {paceRangeFromSec(pace.min, pace.max)}
                </span>
            )}
        </div>
    );
}
