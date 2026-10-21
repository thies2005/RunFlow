'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { X, CheckCircle2, Circle, ArrowUpRight, Flame, Target as TargetIcon, Clock, MapPin, Download } from 'lucide-react';
import { colorsFor } from '@/app/calendar-preview/components/workoutColors';
import { parseStructuredWorkout, type StructuredWorkoutV2, type StepNode, type StructuredStep } from '@/lib/plans/structured';
import { generateMyWhooshZwoXml } from '@/lib/plans/zwoExporter';
import { fmtDuration, fmtKm, fmtPace } from '@/app/calendar-preview/components/metrics';
import type { MockWorkout } from '@/app/calendar-preview/components/mockData';

export interface CalendarWorkoutDetailDrawerProps {
    workout: MockWorkout | null;
    goalId?: string | null;
    isOpen: boolean;
    onClose: () => void;
    onToggleComplete?: (_workoutId: string, _currentCompleted: boolean) => void;
}

export function CalendarWorkoutDetailDrawer({
    workout,
    goalId,
    isOpen,
    onClose,
    onToggleComplete,
}: CalendarWorkoutDetailDrawerProps) {
    const parsedV2: StructuredWorkoutV2 | null = useMemo(() => {
        if (!workout?.structuredSteps) return null;
        return parseStructuredWorkout(workout.structuredSteps, workout.type);
    }, [workout]);

    if (!isOpen || !workout) return null;

    const colors = colorsFor(workout.type);
    const dateFormatted = workout.scheduledDate
        ? format(new Date(workout.scheduledDate), 'EEEE, MMMM d, yyyy')
        : '';

    const isBike = workout.type === 'RIDE' || workout.sport === 'BIKE';
    const isSwim = workout.type === 'SWIM' || workout.sport === 'SWIM';

    // Primary target display
    let primaryTargetLabel = 'Free / Easy';
    if (isBike) {
        if (workout.targetPowerMinWatts && workout.targetPowerMaxWatts) {
            primaryTargetLabel = `${workout.targetPowerMinWatts}–${workout.targetPowerMaxWatts} W`;
            if (workout.targetFtpPercent) {
                primaryTargetLabel += ` (${workout.targetFtpPercent}% FTP)`;
            }
        } else if (workout.targetPowerWatts) {
            primaryTargetLabel = `${workout.targetPowerWatts} W`;
        }
    } else if (isSwim) {
        if (workout.targetPaceMinSecondsPerKm) {
            primaryTargetLabel = fmtPace(workout.targetPaceMinSecondsPerKm, '100m');
        }
    } else {
        if (workout.targetPaceMinSecondsPerKm && workout.targetPaceMaxSecondsPerKm) {
            primaryTargetLabel = `${fmtPace(workout.targetPaceMinSecondsPerKm, '')}–${fmtPace(workout.targetPaceMaxSecondsPerKm, 'km')}`;
        } else if (workout.targetPaceMinSecondsPerKm) {
            primaryTargetLabel = fmtPace(workout.targetPaceMinSecondsPerKm, 'km');
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-fade-in">
            <div
                className="w-full max-w-md h-full bg-background-secondary border-l border-line flex flex-col shadow-2xl animate-slide-left overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Planned Workout Details"
            >
                {/* Header */}
                <div className="p-4 border-b border-line flex items-start justify-between bg-background-tertiary">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${colors.bg} ${colors.text}`}>
                                {workout.type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-background border border-line text-foreground-muted font-medium">
                                {workout.phase}
                            </span>
                        </div>
                        <h2 className="text-lg font-bold text-foreground">{workout.name}</h2>
                        <p className="text-xs text-foreground-muted mt-0.5">{dateFormatted}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md hover:bg-background text-foreground-muted hover:text-foreground transition-colors"
                        aria-label="Close drawer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Completion Status Toggle */}
                    <button
                        onClick={() => onToggleComplete?.(workout.id, workout.completed)}
                        className={`w-full flex items-center justify-between p-3 rounded-md border text-sm font-medium transition-colors ${
                            workout.completed
                                ? 'bg-positive/10 border-positive/30 text-positive'
                                : 'bg-background-tertiary border-line text-foreground hover:bg-background'
                        }`}
                    >
                        <span className="flex items-center gap-2">
                            {workout.completed ? (
                                <CheckCircle2 className="w-4 h-4 text-positive" />
                            ) : (
                                <Circle className="w-4 h-4 text-foreground-muted" />
                            )}
                            {workout.completed ? 'Completed' : 'Mark as Complete'}
                        </span>
                        <span className="text-xs text-foreground-muted font-normal">
                            {workout.completed ? 'Click to uncomplete' : 'Click to complete'}
                        </span>
                    </button>

                    {/* Target Strip */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-background-tertiary border border-line rounded-md p-2.5">
                            <div className="flex items-center gap-1.5 text-xs text-foreground-muted mb-1">
                                <MapPin className="w-3.5 h-3.5 text-accent-blue" />
                                <span>Volume</span>
                            </div>
                            <div className="text-sm font-bold font-mono text-foreground">
                                {workout.targetDistance ? fmtKm(workout.targetDistance) : workout.targetDuration ? fmtDuration(workout.targetDuration) : '—'}
                            </div>
                        </div>

                        <div className="bg-background-tertiary border border-line rounded-md p-2.5">
                            <div className="flex items-center gap-1.5 text-xs text-foreground-muted mb-1">
                                <TargetIcon className="w-3.5 h-3.5 text-accent-orange" />
                                <span>Target Effort</span>
                            </div>
                            <div className="text-sm font-bold font-mono text-foreground truncate" title={primaryTargetLabel}>
                                {primaryTargetLabel}
                            </div>
                        </div>

                        <div className="bg-background-tertiary border border-line rounded-md p-2.5">
                            <div className="flex items-center gap-1.5 text-xs text-foreground-muted mb-1">
                                <Clock className="w-3.5 h-3.5 text-workout-tempo" />
                                <span>HR Zone</span>
                            </div>
                            <div className="text-sm font-bold font-mono text-foreground">
                                {workout.targetHrZone ? `Zone ${workout.targetHrZone}` : '—'}
                            </div>
                        </div>

                        <div className="bg-background-tertiary border border-line rounded-md p-2.5">
                            <div className="flex items-center gap-1.5 text-xs text-foreground-muted mb-1">
                                <Flame className="w-3.5 h-3.5 text-negative" />
                                <span>Planned TSS</span>
                            </div>
                            <div className="text-sm font-bold font-mono text-foreground">
                                {workout.plannedTss ? workout.plannedTss.toFixed(0) : '—'}
                            </div>
                        </div>
                    </div>

                    {/* Step Structure Preview */}
                    {parsedV2 && parsedV2.steps.length > 0 && (
                        <div className="bg-background-tertiary border border-line rounded-md p-3 space-y-3">
                            <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                                Workout Structure
                            </h3>

                            {/* SVG Mini Bar Profile */}
                            <div className="h-12 w-full bg-background rounded border border-line flex items-end p-1 gap-1 overflow-hidden">
                                {parsedV2.steps.map((node, i) => {
                                    const heightPercent = node.kind === 'repeat' ? 85 : node.kind === 'work' ? 80 : node.kind === 'warmup' || node.kind === 'cooldown' ? 50 : 35;
                                    const barColor = node.kind === 'work' ? 'bg-accent-orange' : node.kind === 'repeat' ? 'bg-accent-pink' : 'bg-accent-blue/60';
                                    return (
                                        <div
                                            key={i}
                                            style={{ height: `${heightPercent}%` }}
                                            className={`flex-1 rounded-t-sm ${barColor} opacity-80 hover:opacity-100 transition-opacity`}
                                            title={node.kind}
                                        />
                                    );
                                })}
                            </div>

                            {/* Step Tree */}
                            <div className="space-y-1.5 text-xs">
                                {parsedV2.steps.map((node, i) => (
                                    <StepNodeRow key={i} node={node} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-line bg-background-tertiary space-y-2">
                    {isBike && (
                        <button
                            type="button"
                            onClick={() => {
                                const xml = generateMyWhooshZwoXml({
                                    name: workout.name || 'RunFlow Cycling Workout',
                                    description: workout.name || '',
                                    workoutType: workout.type,
                                    targetDurationSeconds: workout.targetDuration || 3600,
                                    phase: workout.phase,
                                    structuredSteps: parsedV2,
                                });
                                const blob = new Blob([xml], { type: 'application/octet-stream' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${(workout.name || workout.type).replace(/[^a-z0-9-_]+/gi, '_')}.zwo`;
                                document.body.appendChild(a);
                                a.click();
                                URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md border border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan font-semibold text-xs hover:bg-accent-cyan/20 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export Workout to MyWhoosh (.zwo)
                        </button>
                    )}
                    {goalId && (
                        <Link
                            href={`/plan-advanced/${goalId}?workoutId=${workout.id}`}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-accent-orange text-white font-semibold text-sm hover:bg-accent-orange/90 transition-colors shadow-sm"
                        >
                            Open in Advanced Plan Studio
                            <ArrowUpRight className="w-4 h-4" />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

function StepNodeRow({ node, depth = 0 }: { node: StepNode; depth?: number }) {
    if (node.kind === 'repeat') {
        return (
            <div className={`space-y-1 ${depth > 0 ? 'ml-3 pl-2 border-l border-line' : ''}`}>
                <div className="font-semibold text-accent-pink flex items-center gap-1.5">
                    <span>{node.times}× Repeat Set</span>
                    {node.setRest && (
                        <span className="text-[10px] text-foreground-muted font-normal font-mono">
                            ({node.setRest.type === 'time' ? `${node.setRest.seconds}s` : ''} rest)
                        </span>
                    )}
                </div>
                {node.steps.map((child, idx) => (
                    <StepNodeRow key={idx} node={child} depth={depth + 1} />
                ))}
            </div>
        );
    }

    const step = node as StructuredStep;
    const dur =
        step.duration.type === 'distance'
            ? `${step.duration.meters}m`
            : step.duration.type === 'time'
            ? `${Math.round(step.duration.seconds / 60)}m`
            : 'Lap press';

    let targetDesc = '';
    if (step.target?.type === 'power') {
        targetDesc = `${step.target.minWatts ?? ''}–${step.target.maxWatts ?? ''}W`;
    } else if (step.target?.type === 'pace') {
        targetDesc = step.target.min ? `${fmtPace(step.target.min)}` : '';
    } else if (step.target?.type === 'rpe') {
        targetDesc = `RPE ${step.target.value}`;
    }

    return (
        <div className={`flex items-center justify-between py-1 px-2 rounded bg-background/50 border border-line/40 ${depth > 0 ? 'ml-3' : ''}`}>
            <div className="flex items-center gap-2 truncate">
                <span className="capitalize font-medium text-foreground">{step.label || step.kind}</span>
                {step.note && <span className="text-[10px] text-foreground-muted truncate">({step.note})</span>}
            </div>
            <div className="flex items-center gap-2 font-mono shrink-0 text-foreground-muted text-[11px]">
                {targetDesc && <span className="text-accent-orange">{targetDesc}</span>}
                <span>{dur}</span>
            </div>
        </div>
    );
}
