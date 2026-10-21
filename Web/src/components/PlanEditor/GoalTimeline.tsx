'use client';

import React, { useMemo, useState } from 'react';
import type { Goal } from '@/app/plan-advanced/[goalId]/components/Progression/types';
import { GoalTimelineMarker } from '@/app/plan-advanced/[goalId]/components/MultiGoal/GoalTimelineMarker';
import type { PhaseBlock } from '@/lib/plans';
import { Edit3, Check, X, Shield, ChevronRight } from 'lucide-react';

const PHASE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    BASE: { bg: 'bg-accent-blue/15', border: 'border-accent-blue/40', text: 'text-accent-blue' },
    BUILD: { bg: 'bg-workout-tempo/15', border: 'border-workout-tempo/40', text: 'text-workout-tempo' },
    PEAK: { bg: 'bg-workout-long-run/15', border: 'border-workout-long-run/40', text: 'text-workout-long-run' },
    TAPER: { bg: 'bg-workout-recovery/15', border: 'border-workout-recovery/40', text: 'text-workout-recovery' },
    RACE_WEEK: { bg: 'bg-positive/15', border: 'border-positive/40', text: 'text-positive' },
    RECOVERY: { bg: 'bg-foreground/10', border: 'border-foreground/20', text: 'text-foreground-secondary' },
};

interface GoalTimelineProps {
    goals: Goal[];
    planStartDate: Date;
    planEndDate: Date;
    currentWeek: number;
    onMarkerClick: (_goalId: string) => void;
    phaseBlocks?: PhaseBlock[];
    onUpdatePhaseBlocks?: (blocks: PhaseBlock[]) => void;
}

export function GoalTimeline({
    goals,
    planStartDate,
    planEndDate,
    currentWeek,
    onMarkerClick,
    phaseBlocks = [],
    onUpdatePhaseBlocks,
}: GoalTimelineProps) {
    const totalMs = planEndDate.getTime() - planStartDate.getTime();
    const totalDays = Math.max(1, Math.round(totalMs / (24 * 60 * 60 * 1000)));
    const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));

    // Fallback phaseBlocks if none provided
    const effectivePhaseBlocks = useMemo<PhaseBlock[]>(() => {
        if (phaseBlocks && phaseBlocks.length > 0) return phaseBlocks;
        // Derive standard 4-phase fallback if not explicitly in DB
        const taper = 3;
        const peak = 3;
        const build = Math.max(2, Math.floor((totalWeeks - taper - peak) * 0.5));
        const base = Math.max(1, totalWeeks - taper - peak - build);

        let curW = 1;
        const blocks: PhaseBlock[] = [];

        if (base > 0) {
            blocks.push({
                phase: 'BASE' as any,
                startWeek: curW,
                endWeek: curW + base - 1,
                startDate: new Date(planStartDate.getTime() + (curW - 1) * 7 * 86400000).toISOString().slice(0, 10),
                endDate: new Date(planStartDate.getTime() + (curW + base - 1) * 7 * 86400000).toISOString().slice(0, 10),
                weeklyRunKmTarget: 40,
                weeklyBikeTssTarget: null,
                weeklySwimMetersTarget: null,
                targetTss: 250,
                focus: 'Aerobic base & consistency',
            });
            curW += base;
        }

        if (build > 0) {
            blocks.push({
                phase: 'BUILD' as any,
                startWeek: curW,
                endWeek: curW + build - 1,
                startDate: new Date(planStartDate.getTime() + (curW - 1) * 7 * 86400000).toISOString().slice(0, 10),
                endDate: new Date(planStartDate.getTime() + (curW + build - 1) * 7 * 86400000).toISOString().slice(0, 10),
                weeklyRunKmTarget: 50,
                weeklyBikeTssTarget: null,
                weeklySwimMetersTarget: null,
                targetTss: 320,
                focus: 'Threshold & lactate tolerance',
            });
            curW += build;
        }

        if (peak > 0) {
            blocks.push({
                phase: 'PEAK' as any,
                startWeek: curW,
                endWeek: curW + peak - 1,
                startDate: new Date(planStartDate.getTime() + (curW - 1) * 7 * 86400000).toISOString().slice(0, 10),
                endDate: new Date(planStartDate.getTime() + (curW + peak - 1) * 7 * 86400000).toISOString().slice(0, 10),
                weeklyRunKmTarget: 60,
                weeklyBikeTssTarget: null,
                weeklySwimMetersTarget: null,
                targetTss: 380,
                focus: 'Race pace sharpening',
            });
            curW += peak;
        }

        if (taper > 0) {
            blocks.push({
                phase: 'TAPER' as any,
                startWeek: curW,
                endWeek: totalWeeks,
                startDate: new Date(planStartDate.getTime() + (curW - 1) * 7 * 86400000).toISOString().slice(0, 10),
                endDate: planEndDate.toISOString().slice(0, 10),
                weeklyRunKmTarget: 35,
                weeklyBikeTssTarget: null,
                weeklySwimMetersTarget: null,
                targetTss: 200,
                focus: 'Tapering & race day form',
            });
        }

        return blocks;
    }, [phaseBlocks, totalWeeks, planStartDate, planEndDate]);

    const [editingBlockIdx, setEditingBlockIdx] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<PhaseBlock | null>(null);

    const markers = useMemo(() => {
        if (totalMs <= 0) return [];
        return goals
            .filter((g) => g.raceDate)
            .map((g) => {
                const eventDate = new Date(g.raceDate!);
                const offsetMs = eventDate.getTime() - planStartDate.getTime();
                const x = Math.max(0, Math.min(100, (offsetMs / totalMs) * 100));
                return { goal: g, x };
            })
            .sort((a, b) => a.x - b.x);
    }, [goals, planStartDate, totalMs]);

    const currentX = useMemo(() => {
        if (totalDays <= 0) return 0;
        return Math.max(0, Math.min(100, (((currentWeek - 1) * 7) / totalDays) * 100));
    }, [currentWeek, totalDays]);

    const handleStartEdit = (idx: number) => {
        setEditingBlockIdx(idx);
        setEditForm({ ...effectivePhaseBlocks[idx] });
    };

    const handleSaveBlock = () => {
        if (editingBlockIdx === null || !editForm) return;
        const updated = [...effectivePhaseBlocks];
        updated[editingBlockIdx] = editForm;
        onUpdatePhaseBlocks?.(updated);
        setEditingBlockIdx(null);
        setEditForm(null);
    };

    if (totalMs <= 0) return null;

    return (
        <div className="px-4 py-2 border-b border-glass-border bg-background-secondary/30 space-y-2">
            {/* Phase Blocks Strip */}
            <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-foreground-muted">
                    <span className="font-semibold uppercase tracking-wider">Plan Phase Blocks</span>
                    <span>Total: {totalWeeks} weeks</span>
                </div>

                <div className="flex w-full h-8 rounded border border-glass-border overflow-hidden divide-x divide-glass-border">
                    {effectivePhaseBlocks.map((block, idx) => {
                        const blockWeeks = Math.max(1, block.endWeek - block.startWeek + 1);
                        const flexGrow = blockWeeks;
                        const colorScheme = PHASE_COLORS[block.phase] || PHASE_COLORS.BASE;

                        return (
                            <div
                                key={idx}
                                style={{ flex: flexGrow }}
                                onClick={() => handleStartEdit(idx)}
                                className={`h-full ${colorScheme.bg} px-1.5 py-1 flex flex-col justify-center cursor-pointer hover:brightness-110 transition-all select-none overflow-hidden group relative`}
                                title={`${block.phase} (W${block.startWeek}-W${block.endWeek}) — ${block.weeklyRunKmTarget} km/wk, ${block.targetTss ?? 0} TSS/wk. Click to edit.`}
                            >
                                <div className="flex items-center justify-between gap-1 leading-tight">
                                    <span className={`text-[10px] font-bold truncate ${colorScheme.text}`}>
                                        {block.phase}
                                    </span>
                                    <span className="text-[9px] font-mono text-foreground-muted shrink-0">
                                        W{block.startWeek}-{block.endWeek}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[8px] font-mono text-foreground-muted truncate">
                                    <span>{block.weeklyRunKmTarget}k run</span>
                                    {block.weeklyBikeTssTarget != null && block.weeklyBikeTssTarget > 0 && (
                                        <span>· {block.weeklyBikeTssTarget} bike TSS</span>
                                    )}
                                    {block.weeklySwimMetersTarget != null && block.weeklySwimMetersTarget > 0 && (
                                        <span>· {block.weeklySwimMetersTarget}m swim</span>
                                    )}
                                    {block.targetTss && <span>· {block.targetTss} TSS</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Sub-Goals & Current Progress Timeline Line */}
            <div className="relative h-9">
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-background-tertiary" />

                {/* Now marker */}
                <div
                    className="absolute top-1 w-px h-7 bg-foreground/30 z-10"
                    style={{ left: `${currentX}%` }}
                >
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-accent-blue" />
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[8px] font-semibold text-accent-blue whitespace-nowrap mt-2.5">
                        Now (W{currentWeek})
                    </span>
                </div>

                {/* Goal Markers */}
                {markers.map(({ goal, x }) => (
                    <GoalTimelineMarker
                        key={goal.id}
                        goal={goal}
                        x={x}
                        onClick={() => onMarkerClick(goal.id)}
                    />
                ))}
            </div>

            {/* Inline Phase Block Edit Modal */}
            {editingBlockIdx !== null && editForm && (
                <div className="p-3 bg-background-secondary border border-glass-border rounded-md space-y-2 mt-2 text-xs">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                            Edit Phase Block: {editForm.phase}
                        </span>
                        <button
                            type="button"
                            onClick={() => setEditingBlockIdx(null)}
                            className="text-foreground-muted hover:text-foreground"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                            <label className="block text-[10px] text-foreground-muted mb-0.5">Start Week</label>
                            <input
                                type="number"
                                min={1}
                                max={totalWeeks}
                                value={editForm.startWeek}
                                onChange={(e) =>
                                    setEditForm({ ...editForm, startWeek: parseInt(e.target.value, 10) || 1 })
                                }
                                className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-foreground-muted mb-0.5">End Week</label>
                            <input
                                type="number"
                                min={editForm.startWeek}
                                max={totalWeeks}
                                value={editForm.endWeek}
                                onChange={(e) =>
                                    setEditForm({ ...editForm, endWeek: parseInt(e.target.value, 10) || totalWeeks })
                                }
                                className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-foreground-muted mb-0.5">Target Run Km/wk</label>
                            <input
                                type="number"
                                min={0}
                                max={300}
                                value={editForm.weeklyRunKmTarget}
                                onChange={(e) =>
                                    setEditForm({ ...editForm, weeklyRunKmTarget: parseFloat(e.target.value) || 0 })
                                }
                                className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-foreground-muted mb-0.5">Target TSS/wk</label>
                            <input
                                type="number"
                                min={0}
                                max={1500}
                                value={editForm.targetTss ?? ''}
                                onChange={(e) =>
                                    setEditForm({ ...editForm, targetTss: parseInt(e.target.value, 10) || null })
                                }
                                className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-glass-border">
                        <button
                            type="button"
                            onClick={() => setEditingBlockIdx(null)}
                            className="px-2.5 py-1 rounded text-xs text-foreground-muted hover:text-foreground"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveBlock}
                            className="flex items-center gap-1 px-3 py-1 rounded bg-accent-blue text-white text-xs font-medium hover:bg-accent-blue/90"
                        >
                            <Check className="w-3 h-3" />
                            <span>Save Block</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GoalTimeline;
