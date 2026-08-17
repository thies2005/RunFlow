'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trophy, Clock, Edit3, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import RaceActivityPicker from './RaceActivityPicker';
import type { Goal, SuggestedRaceActivity } from '@/lib/types';
import { formatDistanceWithUnit, formatPace as formatPaceWithUnits, useUnits } from '@/lib/units';

interface RaceResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    goal: Goal;
    suggestedActivity?: SuggestedRaceActivity | null;
    initialMode?: 'suggest' | 'review' | 'pick';
}

interface TimeParts {
    hours: string;
    minutes: string;
    seconds: string;
}

function formatTime(seconds: number | null | undefined): string {
    if (!seconds || seconds <= 0) return '-';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTimeDelta(goalTime: number, actualTime: number): { text: string; positive: boolean } {
    const delta = actualTime - goalTime;
    const sign = delta >= 0 ? '+' : '-';
    const absDelta = Math.abs(delta);
    const hrs = Math.floor(absDelta / 3600);
    const mins = Math.floor((absDelta % 3600) / 60);
    const secs = Math.round(absDelta % 60);
    let text = '';
    if (hrs > 0) text = `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    else if (mins > 0) text = `${mins}:${secs.toString().padStart(2, '0')}`;
    else text = `${secs}s`;
    return { text: `${sign}${text}`, positive: delta > 0 };
}

function secondsToTimeParts(totalSeconds: number | null | undefined): TimeParts {
    if (!totalSeconds || totalSeconds <= 0) {
        return { hours: '', minutes: '', seconds: '' };
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    return {
        hours: hours > 0 ? String(hours) : '',
        minutes: String(minutes),
        seconds: String(seconds),
    };
}

function timePartsToSeconds({ hours, minutes, seconds }: TimeParts): number | null {
    const hasValue = hours !== '' || minutes !== '' || seconds !== '';
    if (!hasValue) return null;

    const parsedHours = Number(hours || '0');
    const parsedMinutes = Number(minutes || '0');
    const parsedSeconds = Number(seconds || '0');

    if ([parsedHours, parsedMinutes, parsedSeconds].some(value => Number.isNaN(value) || value < 0)) {
        return null;
    }

    return (parsedHours * 3600) + (parsedMinutes * 60) + parsedSeconds;
}

function updateTimePart(parts: TimeParts, key: keyof TimeParts, value: string): TimeParts {
    const normalized = value.replace(/\D/g, '');
    return { ...parts, [key]: normalized };
}

function TimeInputGroup({
    label,
    idPrefix,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    idPrefix: string;
    value: TimeParts;
    onChange: (_next: TimeParts) => void;
    placeholder?: string;
}) {
    const inputClass = 'w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-foreground text-sm placeholder-foreground-muted outline-hidden focus:ring-2 focus:ring-accent-orange transition-all';

    return (
        <div>
            <label className="block text-xs text-foreground-muted mb-1.5">{label}</label>
            <div className="grid grid-cols-3 gap-2">
                <div>
                    <input
                        id={`${idPrefix}-hours`}
                        type="number"
                        min="0"
                        value={value.hours}
                        onChange={e => onChange(updateTimePart(value, 'hours', e.target.value))}
                        placeholder="hh"
                        className={inputClass}
                    />
                    <p className="text-[10px] text-foreground-muted mt-1 text-center">hours</p>
                </div>
                <div>
                    <input
                        id={`${idPrefix}-minutes`}
                        type="number"
                        min="0"
                        value={value.minutes}
                        onChange={e => onChange(updateTimePart(value, 'minutes', e.target.value))}
                        placeholder="mm"
                        className={inputClass}
                    />
                    <p className="text-[10px] text-foreground-muted mt-1 text-center">minutes</p>
                </div>
                <div>
                    <input
                        id={`${idPrefix}-seconds`}
                        type="number"
                        min="0"
                        value={value.seconds}
                        onChange={e => onChange(updateTimePart(value, 'seconds', e.target.value))}
                        placeholder="ss"
                        className={inputClass}
                    />
                    <p className="text-[10px] text-foreground-muted mt-1 text-center">seconds</p>
                </div>
            </div>
            {placeholder && <p className="text-[10px] text-foreground-muted mt-1">{placeholder}</p>}
        </div>
    );
}

export default function RaceResultModal({
    isOpen,
    onClose,
    goal,
    suggestedActivity,
    initialMode = 'suggest',
}: RaceResultModalProps) {
    const queryClient = useQueryClient();
    const { useImperial } = useUnits();
    const [mode, setMode] = useState<'suggest' | 'review' | 'pick'>(initialMode);
    const [showDetails, setShowDetails] = useState(false);

    const [raceActivityId, setRaceActivityId] = useState<string | null>(null);
    const [actualTime, setActualTime] = useState<TimeParts>({ hours: '', minutes: '', seconds: '' });
    const [chipTime, setChipTime] = useState<TimeParts>({ hours: '', minutes: '', seconds: '' });
    const [placementOverall, setPlacementOverall] = useState('');
    const [placementGender, setPlacementGender] = useState('');
    const [placementAgeGroup, setPlacementAgeGroup] = useState('');
    const [ageGroup, setAgeGroup] = useState('');
    const [totalFinishers, setTotalFinishers] = useState('');
    const [weatherConditions, setWeatherConditions] = useState('');
    const [feltLike, setFeltLike] = useState<string>('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        if (initialMode === 'suggest' && suggestedActivity) {
            setRaceActivityId(suggestedActivity.id);
            setActualTime(secondsToTimeParts(suggestedActivity.movingTime));
        }
        if (!suggestedActivity) {
            setActualTime({ hours: '', minutes: '', seconds: '' });
        }
        setChipTime({ hours: '', minutes: '', seconds: '' });
        setMode(initialMode);
        setShowDetails(false);
    }, [isOpen, initialMode, suggestedActivity]);

    const { data: planData } = useQuery({
        queryKey: ['plan', goal.id, 'full'],
        queryFn: async () => {
            const res = await fetch(`/api/plan?goalId=${goal.id}`);
            if (!res.ok) throw new Error('Failed to fetch plan');
            return res.json();
        },
        staleTime: 60000,
        enabled: isOpen,
    });

    const workouts = planData?.goal?.workouts || goal.workouts || [];
    const workoutStats = workouts
        ? {
            total: workouts.length,
            completed: workouts.filter((w: NonNullable<Goal['workouts']>[number]) => w.isCompleted).length,
        }
        : { total: 0, completed: 0 };
    const completionRate = workoutStats.total > 0
        ? Math.round((workoutStats.completed / workoutStats.total) * 100)
        : 0;
    const actualTimeSeconds = timePartsToSeconds(actualTime);
    const chipTimeSeconds = timePartsToSeconds(chipTime);

    const completeMutation = useMutation({
        mutationFn: async () => {
            const payload: Record<string, unknown> = {
                raceActivityId,
                chipTime: chipTimeSeconds,
                placementOverall: placementOverall ? parseInt(placementOverall) : null,
                placementGender: placementGender ? parseInt(placementGender) : null,
                placementAgeGroup: placementAgeGroup ? parseInt(placementAgeGroup) : null,
                ageGroup: ageGroup || null,
                totalFinishers: totalFinishers ? parseInt(totalFinishers) : null,
                weatherConditions: weatherConditions || null,
                feltLike: feltLike ? parseInt(feltLike) : null,
                notes: notes || null,
            };
            if (actualTimeSeconds !== null) payload.actualTime = actualTimeSeconds;

            const res = await fetch(`/api/goals/${goal.id}/complete`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to complete goal');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
            queryClient.invalidateQueries({ queryKey: ['plan'] });
            queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
            queryClient.invalidateQueries({ queryKey: ['completed-goals'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
            queryClient.invalidateQueries({ queryKey: ['user-settings'] });
            onClose();
        },
    });

    const isSaving = completeMutation.isPending;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'suggest' ? 'Link Your Race Result' : mode === 'pick' ? 'Select Your Race Run' : 'Race Result'}
            icon={<Trophy className="w-5 h-5 text-accent-orange" />}
            maxWidth="md"
        >
            <div className="space-y-5">
                {/* SUGGEST MODE */}
                {mode === 'suggest' && suggestedActivity && (
                    <div className="space-y-4">
                        <div className="bg-accent-orange/10 border border-accent-orange/30 rounded-xl p-4">
                            <p className="text-sm text-accent-orange font-medium mb-1">
                                We found a run near your race date!
                            </p>
                            <p className="text-xs text-foreground-muted">Is this your race?</p>
                        </div>

                        <div className="bg-foreground/5 border border-foreground/10 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-orange to-accent-pink flex items-center justify-center">
                                    <Trophy className="w-5 h-5 text-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-foreground truncate">{suggestedActivity.name}</p>
                                    <p className="text-xs text-foreground-muted">{format(new Date(suggestedActivity.startDate), 'EEEE, MMMM d, yyyy')}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="bg-foreground/5 rounded-lg p-2">
                                    <p className="text-lg font-bold text-foreground">{formatDistanceWithUnit(suggestedActivity.distance, useImperial, 1)}</p>
                                    <p className="text-[10px] text-foreground-muted">distance</p>
                                </div>
                                <div className="bg-foreground/5 rounded-lg p-2">
                                    <p className="text-lg font-bold text-foreground">{formatTime(suggestedActivity.movingTime)}</p>
                                    <p className="text-[10px] text-foreground-muted">time</p>
                                </div>
                                <div className="bg-foreground/5 rounded-lg p-2">
                                    <p className="text-lg font-bold text-foreground">
                                        {suggestedActivity.averageSpeed
                                            ? formatPaceWithUnits(1000 / suggestedActivity.averageSpeed, useImperial)
                                            : '-'}
                                    </p>
                                    <p className="text-[10px] text-foreground-muted">pace</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setMode('review')}
                                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Yes, that&apos;s my race!
                            </button>
                            <button
                                onClick={() => setMode('pick')}
                                className="flex-1 py-3 border border-foreground/10 text-foreground-muted rounded-lg hover:bg-foreground/5 transition-colors text-sm"
                            >
                                Pick a different run
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full text-xs text-foreground-muted hover:text-foreground-muted transition-colors py-1"
                        >
                            I didn&apos;t race / Skip for now
                        </button>
                    </div>
                )}

                {/* SUGGEST MODE - No suggestion found */}
                {mode === 'suggest' && !suggestedActivity && (
                    <div className="space-y-4">
                        <div className="text-center py-4">
                            <Trophy className="w-12 h-12 mx-auto text-foreground-muted mb-3" />
                            <p className="text-foreground-muted mb-1">No matching run found near {goal.raceDate ? format(new Date(goal.raceDate), 'MMM d') : 'your race date'}</p>
                            <p className="text-xs text-foreground-muted">Your race activity might not have synced yet, or was on a different date.</p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setMode('pick')}
                                className="flex-1 btn-primary py-3"
                            >
                                Select your race run
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 border border-foreground/10 text-foreground-muted rounded-lg hover:bg-foreground/5 transition-colors text-sm"
                            >
                                Skip for now
                            </button>
                        </div>
                    </div>
                )}

                {/* PICK MODE */}
                {mode === 'pick' && (
                    <div className="space-y-4">
                        <RaceActivityPicker
                            raceDate={goal.raceDate ?? undefined}
                            selectedId={raceActivityId}
                            onSelect={(id) => {
                                setRaceActivityId(id);
                            }}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => raceActivityId ? setMode('review') : null}
                                disabled={!raceActivityId}
                                className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continue
                            </button>
                            <button
                                onClick={() => setMode('suggest')}
                                className="flex-1 py-3 border border-foreground/10 text-foreground-muted rounded-lg hover:bg-foreground/5 transition-colors text-sm"
                            >
                                Back
                            </button>
                        </div>
                    </div>
                )}

                {/* REVIEW MODE */}
                {mode === 'review' && (
                    <div className="space-y-4">
                        {/* Time Comparison */}
                        {goal.targetTime && actualTimeSeconds !== null && (
                            <div className="bg-foreground/5 border border-foreground/10 rounded-xl p-4">
                                <p className="text-xs text-foreground-muted uppercase tracking-wider mb-3 text-center">Race Result</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="text-center">
                                        <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-foreground" />
                                        </div>
                                        <p className="text-[10px] text-foreground-muted uppercase">Goal Time</p>
                                        <p className="text-xl font-bold text-foreground">{formatTime(goal.targetTime)}</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-accent-orange to-accent-pink flex items-center justify-center">
                                            <Trophy className="w-5 h-5 text-foreground" />
                                        </div>
                                        <p className="text-[10px] text-foreground-muted uppercase">Actual Time</p>
                                        <p className="text-xl font-bold text-foreground">{formatTime(actualTimeSeconds)}</p>
                                    </div>
                                    <div className="text-center">
                                        <div className={`w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center ${!formatTimeDelta(goal.targetTime, actualTimeSeconds).positive
                                                ? 'bg-green-500/20'
                                                : 'bg-red-500/20'
                                            }`}>
                                            <span className={`text-lg font-bold ${!formatTimeDelta(goal.targetTime, actualTimeSeconds).positive
                                                    ? 'text-green-400'
                                                    : 'text-red-400'
                                                }`}>
                                                {!formatTimeDelta(goal.targetTime, actualTimeSeconds).positive ? '-' : '+'}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-foreground-muted uppercase">Difference</p>
                                        <p className={`text-xl font-bold ${!formatTimeDelta(goal.targetTime, actualTimeSeconds).positive
                                                ? 'text-green-400'
                                                : 'text-red-400'
                                            }`}>
                                            {formatTimeDelta(goal.targetTime, actualTimeSeconds).text}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actual Time Input */}
                        <div className="grid grid-cols-2 gap-3">
                            <TimeInputGroup
                                label="Actual Time"
                                idPrefix="actual-time"
                                value={actualTime}
                                onChange={setActualTime}
                                placeholder={goal.targetTime ? `Goal: ${formatTime(goal.targetTime)}` : undefined}
                            />
                            <TimeInputGroup
                                label="Chip Time"
                                idPrefix="chip-time"
                                value={chipTime}
                                onChange={setChipTime}
                                placeholder="If different from gun time"
                            />
                        </div>

                        {/* Expandable Race Details */}
                        <div className="border border-foreground/10 rounded-xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShowDetails(!showDetails)}
                                className="w-full flex items-center justify-between p-3 bg-foreground/5 hover:bg-foreground/10 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Edit3 className="w-4 h-4 text-accent-orange" />
                                    <span className="text-sm font-medium text-foreground">Race Details</span>
                                </div>
                                {showDetails
                                    ? <ChevronUp className="w-4 h-4 text-foreground-muted" />
                                    : <ChevronDown className="w-4 h-4 text-foreground-muted" />}
                            </button>

                            {showDetails && (
                                <div className="p-3 space-y-3 border-t border-foreground/5">
                                    <p className="text-[10px] text-foreground-muted">Add details about your race. You can edit these later in your Profile.</p>

                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            label="Overall Placement"
                                            id="placement-overall"
                                            type="number"
                                            value={placementOverall}
                                            onChange={e => setPlacementOverall(e.target.value)}
                                            placeholder="e.g. 42"
                                        />
                                        <Input
                                            label="Gender Placement"
                                            id="placement-gender"
                                            type="number"
                                            value={placementGender}
                                            onChange={e => setPlacementGender(e.target.value)}
                                            placeholder="e.g. 12"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            label="Age Group Placement"
                                            id="placement-age-group"
                                            type="number"
                                            value={placementAgeGroup}
                                            onChange={e => setPlacementAgeGroup(e.target.value)}
                                            placeholder="e.g. 5"
                                        />
                                        <Input
                                            label="Age Group"
                                            id="age-group"
                                            type="text"
                                            value={ageGroup}
                                            onChange={e => setAgeGroup(e.target.value)}
                                            placeholder="e.g. M30-34"
                                        />
                                    </div>

                                    <Input
                                        label="Total Finishers"
                                        id="total-finishers"
                                        type="number"
                                        value={totalFinishers}
                                        onChange={e => setTotalFinishers(e.target.value)}
                                        placeholder="e.g. 2500"
                                    />

                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            label="Weather"
                                            id="weather"
                                            type="text"
                                            value={weatherConditions}
                                            onChange={e => setWeatherConditions(e.target.value)}
                                            placeholder="e.g. 15C, sunny"
                                        />
                                        <div>
                                            <label className="block text-xs text-foreground-muted mb-1.5">
                                                How did it feel? (RPE {feltLike || '-'})
                                            </label>
                                            <input
                                                type="range"
                                                min="1"
                                                max="10"
                                                value={feltLike || '5'}
                                                onChange={e => setFeltLike(e.target.value)}
                                                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-accent-orange"
                                            />
                                            <div className="flex justify-between text-[10px] text-foreground-muted">
                                                <span>Easy</span>
                                                <span>Hard</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs text-foreground-muted mb-1.5">Notes</label>
                                        <textarea
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            placeholder="How did the race go? What went well? What would you change?"
                                            rows={3}
                                            className="w-full bg-foreground/5 border border-foreground/10 rounded-lg p-3 text-foreground text-sm placeholder-foreground-muted outline-hidden focus:ring-2 focus:ring-accent-orange transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Training Summary */}
                        <div className="bg-foreground/5 border border-foreground/10 rounded-xl p-4">
                            <p className="text-xs text-foreground-muted uppercase tracking-wider mb-2">Training Summary</p>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-lg font-bold text-foreground">{workoutStats.completed}/{workoutStats.total}</p>
                                    <p className="text-xs text-foreground-muted">workouts completed</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-lg font-bold ${completionRate >= 80 ? 'text-green-400' : completionRate >= 60 ? 'text-yellow-400' : 'text-red-400'
                                        }`}>
                                        {completionRate}%
                                    </p>
                                    <p className="text-xs text-foreground-muted">completion rate</p>
                                </div>
                            </div>
                            <div className="mt-2 h-2 bg-foreground/5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${completionRate >= 80 ? 'bg-green-500' : completionRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                    style={{ width: `${completionRate}%` }}
                                />
                            </div>
                        </div>

                        <p className="text-[10px] text-foreground-muted text-center">
                            You can edit race details later in your Profile &rarr; Past Races
                        </p>

                        {/* Actions */}
                        {completeMutation.isError && (
                            <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
                                {completeMutation.error?.message || 'Failed to complete goal'}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 border border-foreground/10 text-foreground-muted rounded-lg hover:bg-foreground/5 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => completeMutation.mutate()}
                                disabled={isSaving || actualTimeSeconds === null}
                                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <CheckCircle className="w-4 h-4" />
                                )}
                                {isSaving ? 'Saving...' : 'Complete & Archive'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
