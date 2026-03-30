'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Trophy, ChevronDown, ChevronUp, Edit3, X, Save, Loader2, Activity, Calendar } from 'lucide-react';
import type { CompletedGoalSummary } from '@/lib/types';

const raceLabels: Record<string, string> = {
    FIVE_K: '5K',
    TEN_K: '10K',
    HALF_MARATHON: 'Half Marathon',
    MARATHON: 'Marathon',
};

function formatTime(seconds: number | null | undefined): string {
    if (!seconds || seconds <= 0) return '-';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTimeDelta(goalTime: number, actualTime: number): { text: string; beatGoal: boolean } {
    const delta = actualTime - goalTime;
    const sign = delta >= 0 ? '+' : '-';
    const abs = Math.abs(delta);
    const hrs = Math.floor(abs / 3600);
    const mins = Math.floor((abs % 3600) / 60);
    const secs = Math.round(abs % 60);
    let t = '';
    if (hrs > 0) t = `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    else if (mins > 0) t = `${mins}:${secs.toString().padStart(2, '0')}`;
    else t = `${secs}s`;
    return { text: `${sign}${t}`, beatGoal: delta <= 0 };
}

export default function PastRacesSection() {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editGoalId, setEditGoalId] = useState<string | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['completed-goals'],
        queryFn: async () => {
            const res = await fetch('/api/goals/completed');
            if (!res.ok) throw new Error('Failed to fetch completed goals');
            return res.json();
        },
        staleTime: 120000,
    });

    const goals: CompletedGoalSummary[] = data?.goals || [];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-6 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading past races...
            </div>
        );
    }

    if (goals.length === 0) {
        return (
            <div className="text-center py-4">
                <Trophy className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                <p className="text-sm text-gray-500">No completed training plans yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {goals.map(goal => (
                <div key={goal.id}>
                    {editGoalId === goal.id ? (
                        <EditRaceResult
                            goal={goal}
                            onClose={() => setEditGoalId(null)}
                        />
                    ) : (
                        <PastRaceCard
                            goal={goal}
                            isExpanded={expandedId === goal.id}
                            onToggle={() => setExpandedId(expandedId === goal.id ? null : goal.id)}
                            onEdit={() => setEditGoalId(goal.id)}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

function PastRaceCard({ goal, isExpanded, onToggle, onEdit }: {
    goal: CompletedGoalSummary;
    isExpanded: boolean;
    onToggle: () => void;
    onEdit: () => void;
}) {
    const rr = goal.raceResult;
    const hasResult = rr && (rr.actualTime || rr.raceActivityId);
    const beatGoal = rr?.actualTime && goal.targetTime
        ? rr.actualTime <= goal.targetTime
        : null;

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                className="w-full p-3 text-left hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="badge badge-run text-[10px]">{raceLabels[goal.raceType]}</span>
                        <p className="text-sm font-medium text-white truncate">{goal.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-400">{format(new Date(goal.raceDate), 'MMM d, yyyy')}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                </div>

                {!isExpanded && (
                    <div className="flex items-center gap-4 mt-1">
                        {hasResult ? (
                            <>
                                <div className="flex items-center gap-3 text-xs">
                                    <span className="text-gray-400">Goal: <span className="text-white">{formatTime(goal.targetTime)}</span></span>
                                    <span className="text-gray-400">Actual: <span className={beatGoal ? 'text-green-400' : 'text-accent-orange'}>{formatTime(rr?.actualTime)}</span></span>
                                    {goal.targetTime && rr?.actualTime && (
                                        <span className={beatGoal ? 'text-green-400 font-medium' : 'text-accent-orange'}>
                                            {formatTimeDelta(goal.targetTime, rr.actualTime).text}
                                        </span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <span className="text-xs text-gray-500">No race result linked</span>
                        )}
                        <span className={`text-xs ml-auto ${goal.workoutStats.completionRate >= 80 ? 'text-green-400' : 'text-gray-500'}`}>
                            {goal.workoutStats.completed}/{goal.workoutStats.total} workouts
                        </span>
                    </div>
                )}
            </button>

            {isExpanded && (
                <div className="border-t border-white/5 p-3 space-y-4">
                    {/* Race Result */}
                    {hasResult ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs text-accent-orange uppercase font-semibold flex items-center gap-1">
                                    <Trophy className="w-3 h-3" /> Race Result
                                </h4>
                                <button
                                    onClick={onEdit}
                                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                                >
                                    <Edit3 className="w-3 h-3" /> Edit
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white/5 rounded-lg p-2 text-center">
                                    <p className="text-[10px] text-gray-400 uppercase">Goal</p>
                                    <p className="text-sm font-bold text-white">{formatTime(goal.targetTime)}</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-2 text-center">
                                    <p className="text-[10px] text-gray-400 uppercase">Actual</p>
                                    <p className={`text-sm font-bold ${beatGoal ? 'text-green-400' : 'text-accent-orange'}`}>
                                        {formatTime(rr?.actualTime)}
                                    </p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-2 text-center">
                                    <p className="text-[10px] text-gray-400 uppercase">Chip</p>
                                    <p className="text-sm font-bold text-white">{formatTime(rr?.chipTime)}</p>
                                </div>
                            </div>

                            {goal.targetTime && rr?.actualTime && (
                                <div className={`text-center py-2 rounded-lg ${beatGoal ? 'bg-green-500/10 text-green-400' : 'bg-accent-orange/10 text-accent-orange'}`}>
                                    <p className="text-sm font-medium">
                                        {beatGoal ? 'Beat your goal!' : `Missed by ${formatTimeDelta(goal.targetTime, rr.actualTime).text}`}
                                    </p>
                                </div>
                            )}

                            {/* Race Details */}
                            {(rr?.placementOverall || rr?.placementGender || rr?.ageGroup || rr?.totalFinishers || rr?.weatherConditions || rr?.feltLike || rr?.notes) && (
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {rr.placementOverall && (
                                        <div className="bg-white/5 rounded-lg p-2">
                                            <span className="text-gray-400">Placement: </span>
                                            <span className="text-white">{rr.placementOverall}{rr.totalFinishers ? `/${rr.totalFinishers}` : ''}</span>
                                        </div>
                                    )}
                                    {rr.placementGender && (
                                        <div className="bg-white/5 rounded-lg p-2">
                                            <span className="text-gray-400">Gender: </span>
                                            <span className="text-white">{rr.placementGender}</span>
                                        </div>
                                    )}
                                    {rr.ageGroup && (
                                        <div className="bg-white/5 rounded-lg p-2">
                                            <span className="text-gray-400">Age Group: </span>
                                            <span className="text-white">{rr.ageGroup}</span>
                                        </div>
                                    )}
                                    {rr.placementAgeGroup && (
                                        <div className="bg-white/5 rounded-lg p-2">
                                            <span className="text-gray-400">AG Place: </span>
                                            <span className="text-white">{rr.placementAgeGroup}</span>
                                        </div>
                                    )}
                                    {rr.weatherConditions && (
                                        <div className="bg-white/5 rounded-lg p-2">
                                            <span className="text-gray-400">Weather: </span>
                                            <span className="text-white">{rr.weatherConditions}</span>
                                        </div>
                                    )}
                                    {rr.feltLike && (
                                        <div className="bg-white/5 rounded-lg p-2">
                                            <span className="text-gray-400">RPE: </span>
                                            <span className="text-white">{rr.feltLike}/10</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {rr?.raceActivity && (
                                <div className="bg-white/5 rounded-lg p-2 text-xs">
                                    <div className="flex items-center gap-1 text-gray-400 mb-1">
                                        <Activity className="w-3 h-3" />
                                        <span>Linked Activity</span>
                                    </div>
                                    <p className="text-white">{rr.raceActivity.name}</p>
                                    <div className="flex items-center gap-2 text-gray-400 mt-0.5">
                                        <span>{format(new Date(rr.raceActivity.startDate), 'MMM d, yyyy')}</span>
                                        <span>{(rr.raceActivity.distance / 1000).toFixed(1)} km</span>
                                        <span>{formatTime(rr.raceActivity.movingTime)}</span>
                                    </div>
                                </div>
                            )}

                            {rr?.notes && (
                                <div className="bg-white/5 rounded-lg p-2 text-xs">
                                    <span className="text-gray-400">Notes: </span>
                                    <span className="text-gray-300">{rr.notes}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-2">
                            <p className="text-sm text-gray-500">No race result linked</p>
                        </div>
                    )}

                    {/* Training Summary */}
                    <div>
                        <h4 className="text-xs text-gray-400 uppercase font-semibold mb-2 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Training Plan
                        </h4>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400">{goal.planWeeks} weeks, {goal.runsPerWeek}x/week</span>
                            <span className={`text-xs font-medium ${goal.workoutStats.completionRate >= 80 ? 'text-green-400' : goal.workoutStats.completionRate >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {Math.round(goal.workoutStats.completionRate * 100)}%
                            </span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${goal.workoutStats.completionRate >= 0.8 ? 'bg-green-500' : goal.workoutStats.completionRate >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(100, goal.workoutStats.completionRate * 100)}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">
                            {goal.workoutStats.completed}/{goal.workoutStats.total} workouts completed
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

function EditRaceResult({ goal, onClose }: { goal: CompletedGoalSummary; onClose: () => void }) {
    const queryClient = useQueryClient();
    const [actualTime, setActualTime] = useState(goal.raceResult?.actualTime?.toString() || '');
    const [chipTime, setChipTime] = useState(goal.raceResult?.chipTime?.toString() || '');
    const [placementOverall, setPlacementOverall] = useState(goal.raceResult?.placementOverall?.toString() || '');
    const [placementGender, setPlacementGender] = useState(goal.raceResult?.placementGender?.toString() || '');
    const [placementAgeGroup, setPlacementAgeGroup] = useState(goal.raceResult?.placementAgeGroup?.toString() || '');
    const [ageGroup, setAgeGroup] = useState(goal.raceResult?.ageGroup || '');
    const [totalFinishers, setTotalFinishers] = useState(goal.raceResult?.totalFinishers?.toString() || '');
    const [weatherConditions, setWeatherConditions] = useState(goal.raceResult?.weatherConditions || '');
    const [feltLike, setFeltLike] = useState(goal.raceResult?.feltLike?.toString() || '');
    const [notes, setNotes] = useState(goal.raceResult?.notes || '');
    const [message, setMessage] = useState('');

    const saveMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/goals/${goal.id}/race-result`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    actualTime: actualTime ? parseInt(actualTime) : null,
                    chipTime: chipTime ? parseInt(chipTime) : null,
                    placementOverall: placementOverall ? parseInt(placementOverall) : null,
                    placementGender: placementGender ? parseInt(placementGender) : null,
                    placementAgeGroup: placementAgeGroup ? parseInt(placementAgeGroup) : null,
                    ageGroup: ageGroup || null,
                    totalFinishers: totalFinishers ? parseInt(totalFinishers) : null,
                    weatherConditions: weatherConditions || null,
                    feltLike: feltLike ? parseInt(feltLike) : null,
                    notes: notes || null,
                }),
            });
            if (!res.ok) throw new Error('Failed to save');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['completed-goals'] });
            setMessage('Saved!');
            setTimeout(() => { onClose(); }, 1000);
        },
        onError: () => setMessage('Error saving'),
    });

    const inputClass = "bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm w-full outline-none focus:ring-2 focus:ring-accent-orange transition-all";

    return (
        <div className="bg-white/5 border border-accent-orange/30 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-xs text-accent-orange uppercase font-semibold">Edit Race Details</h4>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Actual Time (sec)</label>
                    <input type="number" value={actualTime} onChange={e => setActualTime(e.target.value)} className={inputClass} placeholder="e.g. 7920" />
                </div>
                <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Chip Time (sec)</label>
                    <input type="number" value={chipTime} onChange={e => setChipTime(e.target.value)} className={inputClass} placeholder="If different" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Overall Place</label>
                    <input type="number" value={placementOverall} onChange={e => setPlacementOverall(e.target.value)} className={inputClass} placeholder="e.g. 42" />
                </div>
                <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Gender Place</label>
                    <input type="number" value={placementGender} onChange={e => setPlacementGender(e.target.value)} className={inputClass} placeholder="e.g. 12" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Age Group Place</label>
                    <input type="number" value={placementAgeGroup} onChange={e => setPlacementAgeGroup(e.target.value)} className={inputClass} placeholder="e.g. 5" />
                </div>
                <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Age Group</label>
                    <input type="text" value={ageGroup} onChange={e => setAgeGroup(e.target.value)} className={inputClass} placeholder="e.g. M30-34" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Total Finishers</label>
                    <input type="number" value={totalFinishers} onChange={e => setTotalFinishers(e.target.value)} className={inputClass} placeholder="e.g. 2500" />
                </div>
                <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Weather</label>
                    <input type="text" value={weatherConditions} onChange={e => setWeatherConditions(e.target.value)} className={inputClass} placeholder="15C, sunny" />
                </div>
            </div>

            <div>
                <label className="block text-[10px] text-gray-400 mb-1">RPE (1-10)</label>
                <input type="range" min="1" max="10" value={feltLike || '5'} onChange={e => setFeltLike(e.target.value)} className="w-full accent-accent-orange" />
            </div>

            <div>
                <label className="block text-[10px] text-gray-400 mb-1">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputClass + ' resize-none'} placeholder="How did the race go?" />
            </div>

            {message && <p className={`text-xs text-center ${message.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>{message}</p>}

            <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-2 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 text-xs">Cancel</button>
                <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex-1 py-2 bg-accent-orange text-white rounded-lg hover:bg-accent-orange/90 text-xs flex items-center justify-center gap-1 disabled:opacity-50">
                    {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Save
                </button>
            </div>
        </div>
    );
}
