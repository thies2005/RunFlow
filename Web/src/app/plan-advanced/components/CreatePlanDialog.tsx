'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Trophy, Zap, Waves, Clock } from 'lucide-react';
import { getRaceDefaults } from '@/lib/plans/defaults';

type Sport = 'RUN' | 'TRIATHLON' | 'NO_RACE';

interface CreatePlanDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (goalId: string) => void;
}

const SPORT_OPTIONS: Array<{ value: Sport; label: string; icon: typeof Zap }> = [
    { value: 'RUN', label: 'Running', icon: Zap },
    { value: 'TRIATHLON', label: 'Triathlon', icon: Waves },
    { value: 'NO_RACE', label: 'No Race', icon: Clock },
];

const RUNNING_DISTANCES = [
    { value: 'FIVE_K', label: '5K' },
    { value: 'TEN_K', label: '10K' },
    { value: 'HALF_MARATHON', label: 'Half Marathon' },
    { value: 'MARATHON', label: 'Marathon' },
    { value: 'FIFTY_K', label: '50K' },
    { value: 'FIFTY_MILE', label: '50 Mile' },
    { value: 'HUNDRED_K', label: '100K' },
    { value: 'HUNDRED_MILE', label: '100 Mile' },
    { value: 'TWELVE_HOUR', label: '12hr' },
    { value: 'TWENTY_FOUR_HOUR', label: '24hr' },
    { value: 'BACKYARD_ULTRA', label: 'Backyard Ultra' },
    { value: 'CUSTOM_DISTANCE', label: 'Custom' },
];

const TRIATHLON_DISTANCES = [
    { value: 'SPRINT_TRI', label: 'Sprint' },
    { value: 'OLYMPIC_TRI', label: 'Olympic' },
    { value: 'HALF_IRONMAN', label: 'Half Ironman' },
    { value: 'FULL_IRONMAN', label: 'Full Ironman' },
    { value: 'CUSTOM_TRI', label: 'Custom' },
];

export function CreatePlanDialog({ isOpen, onClose, onCreated }: CreatePlanDialogProps) {
    const queryClient = useQueryClient();
    const [sport, setSport] = useState<Sport>('RUN');
    const [raceType, setRaceType] = useState('MARATHON');
    const [planName, setPlanName] = useState('');
    const [planStartDate, setPlanStartDate] = useState('');
    const [raceDate, setRaceDate] = useState('');
    const [durationWeeks, setDurationWeeks] = useState('12');
    const [runsPerWeek, setRunsPerWeek] = useState(4);
    const [ridesPerWeek, setRidesPerWeek] = useState(0);
    const [swimsPerWeek, setSwimsPerWeek] = useState(0);
    const [weeklyMileage, setWeeklyMileage] = useState(40);
    const [customSwimDistM, setCustomSwimDistM] = useState('');
    const [customBikeDistM, setCustomBikeDistM] = useState('');
    const [customRunDistM, setCustomRunDistM] = useState('');

    useEffect(() => {
        const defaults = getRaceDefaults(raceType);
        setRunsPerWeek(defaults.runsPerWeek);
        setRidesPerWeek(defaults.ridesPerWeek);
        setSwimsPerWeek(defaults.swimsPerWeek);
        setWeeklyMileage(defaults.weeklyVolumeKm);
    }, [raceType]);

    const createMutation = useMutation({
        mutationFn: async (body: Record<string, unknown>) => {
            const res = await fetch('/api/plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to create plan');
            }
            return res.json();
        },
        onSuccess: (data) => {
            toast.success('Plan created!');
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            onCreated(data.plan?.id ?? data.goal?.id);
            resetForm();
            onClose();
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    const resetForm = () => {
        setSport('RUN');
        setRaceType('MARATHON');
        setPlanName('');
        setPlanStartDate('');
        setRaceDate('');
        setDurationWeeks('12');
        setRunsPerWeek(4);
        setRidesPerWeek(0);
        setSwimsPerWeek(0);
        setWeeklyMileage(40);
        setCustomSwimDistM('');
        setCustomBikeDistM('');
        setCustomRunDistM('');
    };

    const handleClose = () => {
        if (createMutation.isPending) return;
        resetForm();
        onClose();
    };

    const handleCreate = () => {
        createMutation.mutate({
            name: planName || `${sport === 'RUN' ? 'Running' : sport === 'TRIATHLON' ? 'Triathlon' : 'Fitness'} Plan`,
            sport,
            raceType: sport === 'NO_RACE' ? null : raceType,
            planStartDate: planStartDate || null,
            raceDate: sport === 'NO_RACE' ? null : (raceDate || null),
            durationWeeks: sport === 'NO_RACE' ? parseInt(durationWeeks) || 12 : undefined,
            runsPerWeek,
            ridesPerWeek,
            swimsPerWeek,
            weeklyMileageGoal: weeklyMileage * 1000,
            planSource: 'advanced',
            creationMode: 'EXPERT_MANUAL',
            ...(raceType === 'CUSTOM_TRI' && {
                customSwimDistM: parseInt(customSwimDistM) || undefined,
                customBikeDistM: parseInt(customBikeDistM) || undefined,
                customRunDistM: parseInt(customRunDistM) || undefined,
            }),
        });
    };

    if (!isOpen) return null;

    const distances = sport === 'TRIATHLON' ? TRIATHLON_DISTANCES : sport === 'RUN' ? RUNNING_DISTANCES : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-orange-400" />
                        Create Plan
                    </h2>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Plan Name</label>
                        <input
                            type="text"
                            value={planName}
                            onChange={(e) => setPlanName(e.target.value)}
                            placeholder="e.g. Boston Marathon 2027"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Sport</label>
                        <div className="grid grid-cols-3 gap-1.5">
                            {SPORT_OPTIONS.map(({ value, label, icon: Icon }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => {
                                        setSport(value);
                                        if (value === 'TRIATHLON') setRaceType('SPRINT_TRI');
                                        else if (value === 'RUN') setRaceType('MARATHON');
                                    }}
                                    className={`p-2 rounded-md border text-center text-xs font-medium transition-colors ${
                                        sport === value
                                            ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                                            : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                                    }`}
                                >
                                    <Icon className="w-4 h-4 mx-auto mb-0.5" />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {distances.length > 0 && (
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Distance</label>
                            <div className="grid grid-cols-4 gap-1">
                                {distances.map(({ value, label }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setRaceType(value)}
                                        className={`px-2 py-1.5 rounded-md text-[11px] font-medium border transition-colors ${
                                            raceType === value
                                                ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                                                : 'border-zinc-700 bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Start Date</label>
                            <input
                                type="date"
                                value={planStartDate}
                                onChange={(e) => setPlanStartDate(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                            />
                        </div>
                        {sport !== 'NO_RACE' && (
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Race Date</label>
                                <input
                                    type="date"
                                    value={raceDate}
                                    onChange={(e) => setRaceDate(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                                />
                            </div>
                        )}
                        {sport === 'NO_RACE' && (
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Duration (weeks)</label>
                                <input
                                    type="number"
                                    value={durationWeeks}
                                    onChange={(e) => setDurationWeeks(e.target.value)}
                                    min={4}
                                    max={52}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Runs / week</label>
                            <input
                                type="number"
                                value={runsPerWeek}
                                onChange={(e) => setRunsPerWeek(parseInt(e.target.value) || 4)}
                                min={2}
                                max={7}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                            />
                        </div>
                        {(sport === 'TRIATHLON') && (
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Rides / week</label>
                                <input
                                    type="number"
                                    value={ridesPerWeek}
                                    onChange={(e) => setRidesPerWeek(parseInt(e.target.value) || 0)}
                                    min={0}
                                    max={7}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                                />
                            </div>
                        )}
                        {(sport === 'TRIATHLON') && (
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Swims / week</label>
                                <input
                                    type="number"
                                    value={swimsPerWeek}
                                    onChange={(e) => setSwimsPerWeek(parseInt(e.target.value) || 0)}
                                    min={0}
                                    max={7}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                                />
                            </div>
                        )}
                        {raceType === 'CUSTOM_TRI' && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Swim (m)</label>
                                    <input
                                        type="number"
                                        value={customSwimDistM}
                                        onChange={(e) => setCustomSwimDistM(e.target.value)}
                                        placeholder="1500"
                                        min={100}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Bike (m)</label>
                                    <input
                                        type="number"
                                        value={customBikeDistM}
                                        onChange={(e) => setCustomBikeDistM(e.target.value)}
                                        placeholder="40000"
                                        min={1000}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Run (m)</label>
                                    <input
                                        type="number"
                                        value={customRunDistM}
                                        onChange={(e) => setCustomRunDistM(e.target.value)}
                                        placeholder="10000"
                                        min={1000}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                                    />
                                </div>
                            </>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Weekly km goal</label>
                            <input
                                type="number"
                                value={weeklyMileage}
                                onChange={(e) => setWeeklyMileage(parseInt(e.target.value) || 40)}
                                min={10}
                                max={150}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 p-4 border-t border-zinc-800">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleCreate}
                        disabled={createMutation.isPending}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-orange-500 hover:bg-orange-400 text-white text-xs font-medium transition-colors disabled:opacity-50"
                    >
                        {createMutation.isPending ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : null}
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
}
