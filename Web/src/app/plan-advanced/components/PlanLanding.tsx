'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    ChevronRight,
    Plus,
    Upload,
    Trophy,
    Zap,
    Waves,
    Calendar,
    Flag,
    Clock,
    X,
} from 'lucide-react';

type Sport = 'RUN' | 'TRIATHLON' | 'NO_RACE';

const SPORT_OPTIONS: Array<{ value: Sport; label: string; icon: typeof Zap; desc: string }> = [
    { value: 'RUN', label: 'Running', icon: Zap, desc: '5K to Ultra' },
    { value: 'TRIATHLON', label: 'Triathlon', icon: Waves, desc: 'Sprint to Ironman' },
    { value: 'NO_RACE', label: 'No Race', icon: Clock, desc: 'General fitness' },
];

const RUNNING_DISTANCES = [
    { value: 'FIVE_K', label: '5K' },
    { value: 'TEN_K', label: '10K' },
    { value: 'HALF_MARATHON', label: 'Half Marathon' },
    { value: 'MARATHON', label: 'Marathon' },
    { value: '50K', label: '50K' },
    { value: '50_MILE', label: '50 Mile' },
    { value: '100K', label: '100K' },
    { value: '100_MILE', label: '100 Mile' },
    { value: '12HR', label: '12hr' },
    { value: '24HR', label: '24hr' },
    { value: 'BACKYARD_ULTRA', label: 'Backyard Ultra' },
    { value: 'CUSTOM_DISTANCE', label: 'Custom Distance' },
];

const TRIATHLON_DISTANCES = [
    { value: 'SPRINT', label: 'Sprint' },
    { value: 'OLYMPIC', label: 'Olympic' },
    { value: 'HALF_IRONMAN', label: 'Half Ironman' },
    { value: 'FULL_IRONMAN', label: 'Full Ironman' },
    { value: 'CUSTOM', label: 'Custom' },
];

interface SubGoalForm {
    name: string;
    sport: Sport;
    raceType: string;
    raceDate: string;
}

export function PlanLanding() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [sport, setSport] = useState<Sport>('RUN');
    const [raceType, setRaceType] = useState('MARATHON');
    const [planName, setPlanName] = useState('');
    const [planStartDate, setPlanStartDate] = useState('');
    const [raceDate, setRaceDate] = useState('');
    const [durationWeeks, setDurationWeeks] = useState('12');
    const [subGoals, setSubGoals] = useState<SubGoalForm[]>([]);
    const [showSubGoalForm, setShowSubGoalForm] = useState(false);
    const [newSubGoal, setNewSubGoal] = useState<SubGoalForm>({
        name: '',
        sport: 'RUN',
        raceType: '',
        raceDate: '',
    });

    const createMutation = useMutation({
        mutationFn: async (body: Record<string, unknown>) => {
            const res = await fetch('/api/plan-advanced', {
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
            queryClient.invalidateQueries({ queryKey: ['plan-advanced'] });
            router.push(`/plan-advanced/${data.plan.id}`);
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    const distances = sport === 'TRIATHLON' ? TRIATHLON_DISTANCES : sport === 'RUN' ? RUNNING_DISTANCES : [];

    const handleCreate = () => {
        const body: Record<string, unknown> = {
            name: planName || `${sport === 'RUN' ? 'Running' : sport === 'TRIATHLON' ? 'Triathlon' : 'Fitness'} Plan`,
            sport,
            raceType: sport === 'NO_RACE' ? null : raceType,
            planStartDate: planStartDate || null,
            raceDate: sport === 'NO_RACE' ? null : (raceDate || null),
            durationWeeks: sport === 'NO_RACE' ? parseInt(durationWeeks) || 12 : undefined,
        };
        if (subGoals.length > 0) {
            body.subGoals = subGoals
                .filter((sg) => sg.name.trim())
                .map((sg) => ({
                    name: sg.name.trim(),
                    sport: sg.sport,
                    raceType: sg.raceType || null,
                    raceDate: sg.raceDate || null,
                }));
        }
        createMutation.mutate(body);
    };

    const addSubGoal = () => {
        if (!newSubGoal.name.trim()) return;
        setSubGoals((prev) => [...prev, { ...newSubGoal }]);
        setNewSubGoal({ name: '', sport: 'RUN', raceType: '', raceDate: '' });
        setShowSubGoalForm(false);
    };

    const removeSubGoal = (index: number) => {
        setSubGoals((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10 max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-orange-400" />
                    Advanced Plan Builder
                </h1>
                <p className="text-sm text-zinc-500 mt-1">Create and customize your training plan with full control.</p>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">Plan Name</label>
                    <input
                        type="text"
                        value={planName}
                        onChange={(e) => setPlanName(e.target.value)}
                        placeholder="e.g. Boston Marathon 2027"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">Sport</label>
                    <div className="grid grid-cols-3 gap-2">
                        {SPORT_OPTIONS.map(({ value, label, icon: Icon, desc }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => {
                                    setSport(value);
                                    if (value === 'TRIATHLON') setRaceType('SPRINT');
                                    else if (value === 'RUN') setRaceType('MARATHON');
                                }}
                                className={`p-3 rounded-lg border text-left transition-colors ${
                                    sport === value
                                        ? 'border-zinc-500 bg-zinc-800'
                                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                                }`}
                            >
                                <Icon className={`w-5 h-5 mb-1 ${sport === value ? 'text-zinc-100' : 'text-zinc-500'}`} />
                                <span className="text-sm font-medium text-zinc-200 block">{label}</span>
                                <span className="text-[10px] text-zinc-600">{desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {distances.length > 0 && (
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-2">
                            {sport === 'RUN' ? 'Distance / Race Type' : 'Triathlon Distance'}
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                            {distances.map(({ value, label }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setRaceType(value)}
                                    className={`px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                                        raceType === value
                                            ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-2">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            Plan Start Date
                        </label>
                        <input
                            type="date"
                            value={planStartDate}
                            onChange={(e) => setPlanStartDate(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                        />
                    </div>
                    {sport !== 'NO_RACE' && (
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-2">
                                <Flag className="w-3 h-3 inline mr-1" />
                                Race / Goal Date
                            </label>
                            <input
                                type="date"
                                value={raceDate}
                                onChange={(e) => setRaceDate(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                            />
                        </div>
                    )}
                    {sport === 'NO_RACE' && (
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-2">
                                <Clock className="w-3 h-3 inline mr-1" />
                                Plan Duration (weeks)
                            </label>
                            <input
                                type="number"
                                value={durationWeeks}
                                onChange={(e) => setDurationWeeks(e.target.value)}
                                min={4}
                                max={52}
                                placeholder="12"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                            />
                        </div>
                    )}
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-zinc-400">Sub-Goals</label>
                        {!showSubGoalForm && (
                            <button
                                type="button"
                                onClick={() => setShowSubGoalForm(true)}
                                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                <Plus className="w-3 h-3" />
                                Add Sub-Goal
                            </button>
                        )}
                    </div>
                    {subGoals.length > 0 && (
                        <div className="space-y-1.5 mb-2">
                            {subGoals.map((sg, i) => (
                                <div key={i} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                                    <div>
                                        <span className="text-xs text-zinc-200">{sg.name}</span>
                                        {sg.raceDate && (
                                            <span className="text-[10px] text-zinc-500 ml-2">{sg.raceDate}</span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeSubGoal(i)}
                                        className="text-zinc-600 hover:text-red-400 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    {showSubGoalForm && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-2">
                            <input
                                type="text"
                                value={newSubGoal.name}
                                onChange={(e) => setNewSubGoal((p) => ({ ...p, name: e.target.value }))}
                                placeholder="Sub-goal name"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                            />
                            <div className="flex gap-2">
                                <select
                                    value={newSubGoal.sport}
                                    onChange={(e) => setNewSubGoal((p) => ({ ...p, sport: e.target.value as Sport }))}
                                    className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                                >
                                    <option value="RUN">Running</option>
                                    <option value="TRIATHLON">Triathlon</option>
                                </select>
                                <input
                                    type="date"
                                    value={newSubGoal.raceDate}
                                    onChange={(e) => setNewSubGoal((p) => ({ ...p, raceDate: e.target.value }))}
                                    className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowSubGoalForm(false);
                                        setNewSubGoal({ name: '', sport: 'RUN', raceType: '', raceDate: '' });
                                    }}
                                    className="px-2.5 py-1 rounded-md text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={addSubGoal}
                                    className="px-2.5 py-1 rounded-md text-xs bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-2 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleCreate}
                        disabled={createMutation.isPending}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white font-medium text-sm transition-colors disabled:opacity-50"
                    >
                        {createMutation.isPending ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )}
                        Create Plan
                    </button>
                    <button
                        type="button"
                        onClick={async () => {
                            const res = await fetch('/api/plan-advanced', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    name: 'Imported Plan',
                                    sport: 'RUN',
                                    raceType: null,
                                    planSource: 'advanced',
                                }),
                            });
                            if (res.ok) {
                                const data = await res.json();
                                router.push(`/plan-advanced/${data.plan.id}`);
                            } else {
                                toast.error('Failed to create plan for import');
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-sm transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        Import CSV
                    </button>
                    </div>
                </div>
            </div>
        );
    }
