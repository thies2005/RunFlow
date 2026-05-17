'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
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
    Target,
} from 'lucide-react';
import CalibrationSection from '@/components/setup/CalibrationSection';
import GoalTimeRenderer from '@/components/setup/GoalTimeRenderer';
import TriathlonGoalTimeRenderer from '@/components/setup/TriathlonGoalTimeRenderer';
import PlanVolumeSection from '@/components/setup/PlanVolumeSection';
import { estimateBackyardUltraTime } from '@/lib/plans/backyard-time';
import { getRaceDefaults, getScaledPhaseDefaults } from '@/lib/plans/defaults';
import { calculateProgressionCoefficient } from '@/lib/metrics/goalProjection';

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
    { value: 'FIFTY_K', label: '50K' },
    { value: 'FIFTY_MILE', label: '50 Mile' },
    { value: 'HUNDRED_K', label: '100K' },
    { value: 'HUNDRED_MILE', label: '100 Mile' },
    { value: 'TWELVE_HOUR', label: '12hr' },
    { value: 'TWENTY_FOUR_HOUR', label: '24hr' },
    { value: 'BACKYARD_ULTRA', label: 'Backyard Ultra' },
    { value: 'CUSTOM_DISTANCE', label: 'Custom Distance' },
];

const TRIATHLON_DISTANCES = [
    { value: 'SPRINT_TRI', label: 'Sprint' },
    { value: 'OLYMPIC_TRI', label: 'Olympic' },
    { value: 'HALF_IRONMAN', label: 'Half Ironman' },
    { value: 'FULL_IRONMAN', label: 'Full Ironman' },
    { value: 'CUSTOM_TRI', label: 'Custom' },
];

const GOAL_TIME_RACE_TYPES = new Set([
    'FIVE_K', 'TEN_K', 'HALF_MARATHON', 'MARATHON',
    'FIFTY_K', 'FIFTY_MILE', 'HUNDRED_K', 'HUNDRED_MILE',
]);

const ULTRA_DISTANCE_MAP: Record<string, number> = {
    'FIFTY_K': 50000,
    'FIFTY_MILE': 80467,
    'HUNDRED_K': 100000,
    'HUNDRED_MILE': 160934,
};

interface SubGoalForm {
    name: string;
    sport: Sport;
    raceType: string;
    raceDate: string;
    targetTime?: number;
}

interface RaceActivity {
    id: string;
    name: string;
    distance: number;
    movingTime: number;
    startDate: string;
}

export function PlanLanding() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [sport, setSport] = useState<Sport>('RUN');
    const [raceType, setRaceType] = useState('FIVE_K');
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

    const [calibrationMode, setCalibrationMode] = useState<'activity' | 'manual'>('manual');
    const [selectedActivityId, setSelectedActivityId] = useState('');
    const [calibrationDistance, setCalibrationDistance] = useState('MARATHON');
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');
    const [seconds, setSeconds] = useState('');
    const [calibrationFactor, setCalibrationFactor] = useState(1.0);

    const [runsPerWeek, setRunsPerWeek] = useState(4);
    const [ridesPerWeek, setRidesPerWeek] = useState(0);
    const [swimsPerWeek, setSwimsPerWeek] = useState(0);
    const [strengthPerWeek, setStrengthPerWeek] = useState(0);
    const [weeklyMileage, setWeeklyMileage] = useState(28);
    const [maxLongRunKm, setMaxLongRunKm] = useState(18);
    const [taperWeeks, setTaperWeeks] = useState(1);
    const [peakWeeks, setPeakWeeks] = useState(2);
    const [buildWeeks, setBuildWeeks] = useState(4);
    const [showSchedulingSettings, setShowSchedulingSettings] = useState(false);
    const [longRunDay, setLongRunDay] = useState(0);
    const [qualityDay, setQualityDay] = useState(3);
    const [swimDay, setSwimDay] = useState(2);
    const [restDays, setRestDays] = useState<number[]>([1, 5]);

    const [goalTimeSeconds, setGoalTimeSeconds] = useState<number | null>(null);
    const [triGoalTimeSeconds, setTriGoalTimeSeconds] = useState<number | null>(null);
    const [isEditingGoalTime, setIsEditingGoalTime] = useState(false);
    const [goalTimeHours, setGoalTimeHours] = useState('');
    const [goalTimeMinutes, setGoalTimeMinutes] = useState('');
    const [goalTimeSecs, setGoalTimeSecs] = useState('');

    const [backyardLoopDistM, setBackyardLoopDistM] = useState<number | null>(null);
    const [targetLaps, setTargetLaps] = useState(2);

    const { data: activitiesData } = useQuery({
        queryKey: ['race-activities'],
        queryFn: async () => {
            const res = await fetch('/api/activities?type=RUN&limit=50&raceEligible=true');
            if (!res.ok) throw new Error('Failed to fetch activities');
            return res.json();
        },
    });

    const { data: statsData } = useQuery({
        queryKey: ['analytics-stats'],
        queryFn: async () => {
            const res = await fetch('/api/analytics/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        },
    });

    const effectiveVO2max = statsData?.effectiveVO2max || 0;
    const shapePercent = statsData?.marathonShape?.shape || 0;

    const raceActivities: RaceActivity[] = activitiesData?.activities?.filter((a: RaceActivity) =>
        a.distance >= 4500
    ) || [];

    const computedPlanWeeks = sport === 'NO_RACE'
        ? (parseInt(durationWeeks) || 12)
        : raceDate && planStartDate
            ? Math.max(4, Math.floor((new Date(raceDate).getTime() - new Date(planStartDate).getTime()) / (7 * 24 * 60 * 60 * 1000)))
            : 12;

    useEffect(() => {
        const defaults = getRaceDefaults(raceType);
        const scaled = getScaledPhaseDefaults(raceType, computedPlanWeeks);
        setRunsPerWeek(defaults.runsPerWeek);
        setRidesPerWeek(defaults.ridesPerWeek);
        setSwimsPerWeek(defaults.swimsPerWeek);
        setStrengthPerWeek(defaults.strengthPerWeek);
        setWeeklyMileage(defaults.weeklyVolumeKm);
        setMaxLongRunKm(defaults.maxLongRunKm);
        setTaperWeeks(scaled.taperWeeks);
        setPeakWeeks(scaled.peakWeeks);
        setBuildWeeks(scaled.buildWeeks);
        if (defaults.backyardLoopDistM) setBackyardLoopDistM(defaults.backyardLoopDistM);
        if (defaults.targetLaps) setTargetLaps(defaults.targetLaps);
    }, [raceType, computedPlanWeeks]);

    const backyardProgressionFactor = calculateProgressionCoefficient(computedPlanWeeks, runsPerWeek, weeklyMileage);
    const backyardVdot = effectiveVO2max * calibrationFactor * backyardProgressionFactor;
    const backyardProjection = backyardLoopDistM && backyardLoopDistM > 0 && sport !== 'NO_RACE' && raceType === 'BACKYARD_ULTRA' && effectiveVO2max > 0
        ? estimateBackyardUltraTime({ vdot: backyardVdot, loopDistM: backyardLoopDistM, targetLaps })
        : null;

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
            router.push(`/plan-advanced/${data.plan?.id ?? data.goal?.id}`);
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    const distances = sport === 'TRIATHLON' ? TRIATHLON_DISTANCES : sport === 'RUN' ? RUNNING_DISTANCES : [];

    const handleCreate = () => {
        const selectedActivity = raceActivities.find((activity) => activity.id === selectedActivityId);
        const manualTimeSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
        const calibrationTimeSeconds = calibrationMode === 'activity'
            ? selectedActivity?.movingTime ?? 0
            : manualTimeSeconds;

        const body: Record<string, unknown> = {
            name: planName || `${sport === 'RUN' ? 'Running' : sport === 'TRIATHLON' ? 'Triathlon' : 'Fitness'} Plan`,
            sport,
            raceType: sport === 'NO_RACE' ? null : raceType,
            planStartDate: planStartDate || null,
            raceDate: sport === 'NO_RACE' ? null : (raceDate || null),
            durationWeeks: sport === 'NO_RACE' ? parseInt(durationWeeks) || 12 : undefined,
            runsPerWeek,
            ridesPerWeek,
            swimsPerWeek,
            strengthPerWeek,
            weeklyMileageGoal: weeklyMileage * 1000,
            maxLongRunKm,
            taperWeeks,
            peakWeeks,
            buildWeeks,
            longRunDay,
            workoutDay: qualityDay,
            swimDay,
            restDays,
            planSource: 'advanced',
            creationMode: 'EXPERT_MANUAL',
            ...((goalTimeSeconds || triGoalTimeSeconds) && { targetTime: goalTimeSeconds || triGoalTimeSeconds }),
            ...(raceType === 'BACKYARD_ULTRA' && backyardLoopDistM && backyardLoopDistM > 0 && {
                backyardLoopDistM,
                targetLaps,
            }),
            ...(calibrationTimeSeconds > 0 && {
                calibrationTime: Math.round(calibrationTimeSeconds),
                calibrationDistance,
                calibrationActivityId: calibrationMode === 'activity' ? selectedActivityId : undefined,
                calibrationFactor,
            }),
        };
        if (subGoals.length > 0) {
            body.subGoals = subGoals
                .filter((sg) => sg.name.trim())
                .map((sg) => ({
                    name: sg.name.trim(),
                    sport: sg.sport,
                    raceType: sg.raceType || null,
                    raceDate: sg.raceDate || null,
                    ...(sg.targetTime && { targetTime: sg.targetTime }),
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
                                    if (value === 'TRIATHLON') setRaceType('SPRINT_TRI');
                                    else if (value === 'RUN') setRaceType('FIVE_K');
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

                {sport !== 'NO_RACE' && (
                    <div className="border-t border-glass-border pt-6">
                        <CalibrationSection
                            calibrationMode={calibrationMode}
                            setCalibrationMode={setCalibrationMode}
                            selectedActivityId={selectedActivityId}
                            setSelectedActivityId={setSelectedActivityId}
                            calibrationDistance={calibrationDistance}
                            setCalibrationDistance={setCalibrationDistance}
                            hours={hours}
                            setHours={setHours}
                            minutes={minutes}
                            setMinutes={setMinutes}
                            seconds={seconds}
                            setSeconds={setSeconds}
                            setCalibrationFactor={setCalibrationFactor}
                            effectiveVO2max={effectiveVO2max}
                            raceActivities={raceActivities}
                        />
                    </div>
                )}

                {sport === 'TRIATHLON' && effectiveVO2max > 0 && (
                    <TriathlonGoalTimeRenderer
                        vdot={effectiveVO2max * calibrationFactor}
                        raceType={raceType}
                        goalTimeSeconds={triGoalTimeSeconds}
                        onGoalTimeChange={setTriGoalTimeSeconds}
                        planWeeks={computedPlanWeeks}
                        runsPerWeek={runsPerWeek}
                        weeklyMileageGoal={weeklyMileage}
                    />
                )}
                {sport === 'RUN' && GOAL_TIME_RACE_TYPES.has(raceType) && (
                    <GoalTimeRenderer
                        mode="onboarding"
                        effectiveVO2max={effectiveVO2max}
                        calibrationFactor={calibrationFactor}
                        raceType={raceType}
                        computedPlanWeeks={computedPlanWeeks}
                        runsPerWeek={runsPerWeek}
                        weeklyMileage={weeklyMileage}
                        taperWeeks={taperWeeks}
                        peakWeeks={peakWeeks}
                        buildWeeks={buildWeeks}
                        shapePercent={shapePercent}
                        goalTimeSeconds={goalTimeSeconds}
                        setGoalTimeSeconds={setGoalTimeSeconds}
                        goalTimeHours={goalTimeHours}
                        setGoalTimeHours={setGoalTimeHours}
                        goalTimeMinutes={goalTimeMinutes}
                        setGoalTimeMinutes={setGoalTimeMinutes}
                        goalTimeSecs={goalTimeSecs}
                        setGoalTimeSecs={setGoalTimeSecs}
                        isEditingGoalTime={isEditingGoalTime}
                        setIsEditingGoalTime={setIsEditingGoalTime}
                        distanceOverrideM={ULTRA_DISTANCE_MAP[raceType]}
                    />
                )}

                {sport !== 'NO_RACE' && raceType === 'BACKYARD_ULTRA' && (
                    <div className="border-t border-glass-border pt-6">
                        <div className="flex items-center gap-2 text-orange-400 mb-3">
                            <Target className="w-5 h-5" />
                            <h3 className="text-sm font-semibold uppercase tracking-wide">Backyard Ultra Setup</h3>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Loop Distance (meters)</label>
                                <input
                                    type="number"
                                    value={backyardLoopDistM ?? ''}
                                    onChange={(e) => setBackyardLoopDistM(e.target.value ? parseFloat(e.target.value) : null)}
                                    placeholder="e.g. 6706"
                                    min={100}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Target Laps: {targetLaps}</label>
                                <input
                                    type="range"
                                    min={1}
                                    max={100}
                                    step={1}
                                    value={targetLaps}
                                    onChange={(e) => setTargetLaps(parseInt(e.target.value))}
                                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                />
                                <div className="flex justify-between text-xs text-zinc-500 mt-1">
                                    <span>1</span>
                                    <span>100</span>
                                </div>
                            </div>
                            <div className="text-xs text-zinc-400">
                                Total distance: <span className="text-zinc-200 font-medium">{backyardLoopDistM ? (backyardLoopDistM * targetLaps / 1000).toFixed(1) : '0'} km</span>
                            </div>
                            {backyardProjection && (
                                <div className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-1">
                                    <div className="text-zinc-400">Estimated finish time:</div>
                                    <div className="text-green-400 font-medium">Optimal: {Math.floor(backyardProjection.optimal.totalSeconds / 3600)}h {Math.floor((backyardProjection.optimal.totalSeconds % 3600) / 60)}m</div>
                                    <div className="text-orange-400 font-medium">Projected: {Math.floor(backyardProjection.projected.totalSeconds / 3600)}h {Math.floor((backyardProjection.projected.totalSeconds % 3600) / 60)}m</div>
                                    <div className="text-red-400 font-medium">Conservative: {Math.floor(backyardProjection.conservative.totalSeconds / 3600)}h {Math.floor((backyardProjection.conservative.totalSeconds % 3600) / 60)}m</div>
                                </div>
                            )}
                            <div className="text-[10px] text-zinc-600">Estimated based on running fitness</div>
                        </div>
                    </div>
                )}

                <div className="border-t border-glass-border pt-6">
                    <PlanVolumeSection
                        runsPerWeek={runsPerWeek}
                        setRunsPerWeek={setRunsPerWeek}
                        ridesPerWeek={ridesPerWeek}
                        setRidesPerWeek={setRidesPerWeek}
                        swimsPerWeek={swimsPerWeek}
                        setSwimsPerWeek={setSwimsPerWeek}
                        strengthPerWeek={strengthPerWeek}
                        setStrengthPerWeek={setStrengthPerWeek}
                        weeklyMileage={weeklyMileage}
                        setWeeklyMileage={setWeeklyMileage}
                        raceType={raceType}
                        maxLongRunKm={maxLongRunKm}
                        setMaxLongRunKm={setMaxLongRunKm}
                        taperWeeks={taperWeeks}
                        setTaperWeeks={setTaperWeeks}
                        peakWeeks={peakWeeks}
                        setPeakWeeks={setPeakWeeks}
                        buildWeeks={buildWeeks}
                        setBuildWeeks={setBuildWeeks}
                        showSchedulingSettings={showSchedulingSettings}
                        setShowSchedulingSettings={setShowSchedulingSettings}
                        longRunDay={longRunDay}
                        setLongRunDay={setLongRunDay}
                        qualityDay={qualityDay}
                        setQualityDay={setQualityDay}
                        swimDay={swimDay}
                        setSwimDay={setSwimDay}
                        restDays={restDays}
                        setRestDays={setRestDays}
                        computedPlanWeeks={computedPlanWeeks}
                    />
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
                                        {sg.targetTime && (
                                            <span className="text-[10px] text-orange-400 ml-2">
                                                {Math.floor(sg.targetTime / 3600)}:{String(Math.floor((sg.targetTime % 3600) / 60)).padStart(2, '0')}
                                            </span>
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
                                    value={newSubGoal.raceType}
                                    onChange={(e) => {
                                        const rt = e.target.value;
                                        let sp: Sport = 'RUN';
                                        if (['SPRINT_TRI', 'OLYMPIC_TRI', 'HALF_IRONMAN', 'FULL_IRONMAN', 'CUSTOM_TRI'].includes(rt)) {
                                            sp = 'TRIATHLON';
                                        }
                                        setNewSubGoal((p) => ({ ...p, raceType: rt, sport: sp }));
                                    }}
                                    className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600 flex-1"
                                >
                                    <option value="">Distance / Type</option>
                                    <optgroup label="Running">
                                        <option value="FIVE_K">5K</option>
                                        <option value="TEN_K">10K</option>
                                        <option value="HALF_MARATHON">Half Marathon</option>
                                        <option value="MARATHON">Marathon</option>
                                    </optgroup>
                                    <optgroup label="Ultra">
                                        <option value="FIFTY_K">50K</option>
                                        <option value="FIFTY_MILE">50 Mile</option>
                                        <option value="HUNDRED_K">100K</option>
                                        <option value="HUNDRED_MILE">100 Mile</option>
                                        <option value="TWELVE_HOUR">12 Hour</option>
                                        <option value="TWENTY_FOUR_HOUR">24 Hour</option>
                                        <option value="BACKYARD_ULTRA">Backyard Ultra</option>
                                    </optgroup>
                                    <optgroup label="Triathlon">
                                        <option value="SPRINT_TRI">Sprint Triathlon</option>
                                        <option value="OLYMPIC_TRI">Olympic Triathlon</option>
                                        <option value="HALF_IRONMAN">Half Ironman (70.3)</option>
                                        <option value="FULL_IRONMAN">Full Ironman</option>
                                        <option value="CUSTOM_TRI">Custom Triathlon</option>
                                    </optgroup>
                                    <optgroup label="Other">
                                        <option value="CUSTOM_DISTANCE">Custom Distance</option>
                                    </optgroup>
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
                        disabled={createMutation.isPending || (raceType === 'BACKYARD_ULTRA' && (!backyardLoopDistM || backyardLoopDistM <= 0))}
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
                            const res = await fetch('/api/plans', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    name: 'Imported Plan',
                                    sport: 'NO_RACE',
                                    raceType: null,
                                    raceDate: null,
                                    durationWeeks: 12,
                                    planSource: 'advanced',
                                }),
                            });
                            if (res.ok) {
                                const data = await res.json();
                                router.push(`/plan-advanced/${data.plan?.id ?? data.goal?.id}`);
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
