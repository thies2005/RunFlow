'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
    Activity, Bike, Move, ChevronDown, ChevronUp,
    AlertCircle, Save, Check, Calendar, Target
} from 'lucide-react';
import { calculatePredictedTimes } from '@/lib/metrics/runalyze';
import { formatTime } from '@/lib/metrics/vdot';

interface PlanSetupFormProps {
    mode: 'onboarding' | 'settings';
    onSuccess: () => void;
    onCancel?: () => void;
    effectiveVO2max?: number;
    shapePercent?: number;
}

interface RaceActivity {
    id: string;
    name: string;
    startDate: string;
    distance: number;
    movingTime: number;
}

export default function PlanSetupForm({
    mode,
    onSuccess,
    onCancel,
    effectiveVO2max = 0,
    shapePercent = 0
}: PlanSetupFormProps) {
    const router = useRouter();
    const queryClient = useQueryClient();

    // Target Race (onboarding only)
    const [goalName, setGoalName] = useState('My First Race');
    const [raceType, setRaceType] = useState('MARATHON');
    const [raceDate, setRaceDate] = useState(
        new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );

    // Calibration Mode
    const [calibrationMode, setCalibrationMode] = useState<'activity' | 'manual'>('manual');
    const [selectedActivityId, setSelectedActivityId] = useState<string>('');

    // Manual Entry
    const [calibrationDistance, setCalibrationDistance] = useState('MARATHON');
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');
    const [seconds, setSeconds] = useState('');

    // Plan Volume
    const [runsPerWeek, setRunsPerWeek] = useState(4);
    const [ridesPerWeek, setRidesPerWeek] = useState(0);
    const [strengthPerWeek, setStrengthPerWeek] = useState(0);
    const [weeklyMileage, setWeeklyMileage] = useState(40);

    // Phase Settings
    const [taperWeeks, setTaperWeeks] = useState(2);
    const [peakWeeks, setPeakWeeks] = useState(4);
    const [buildWeeks, setBuildWeeks] = useState(4);

    // Heart Rate (collapsible)
    const [showHeartRate, setShowHeartRate] = useState(false);
    const [maxHeartRate, setMaxHeartRate] = useState(185);
    const [restingHeartRate, setRestingHeartRate] = useState(55);
    const [weight, setWeight] = useState(70);
    const [zone1Max, setZone1Max] = useState(60);
    const [zone2Max, setZone2Max] = useState(70);
    const [zone3Max, setZone3Max] = useState(80);
    const [zone4Max, setZone4Max] = useState(90);

    const [message, setMessage] = useState('');

    // Fetch race-eligible activities
    const { data: activitiesData } = useQuery({
        queryKey: ['race-activities'],
        queryFn: async () => {
            const res = await fetch('/api/activities?type=RUN&limit=50&raceEligible=true');
            if (!res.ok) throw new Error('Failed to fetch activities');
            return res.json();
        },
    });

    // Fetch existing settings (for settings mode)
    const { data: settingsData } = useQuery({
        queryKey: ['user-settings'],
        queryFn: async () => {
            const res = await fetch('/api/settings/update-vdot');
            if (!res.ok) throw new Error('Failed to fetch settings');
            return res.json();
        },
        enabled: mode === 'settings',
    });

    // Fetch active goal (for settings mode)
    const { data: goalsData } = useQuery({
        queryKey: ['goals'],
        queryFn: async () => {
            const res = await fetch('/api/goals');
            if (!res.ok) throw new Error('Failed to fetch goals');
            return res.json();
        },
        enabled: mode === 'settings',
    });

    // Populate form with existing data
    useEffect(() => {
        if (settingsData) {
            setMaxHeartRate(settingsData.hrMax || 185);
            setRestingHeartRate(settingsData.hrRest || 55);
            setWeight(settingsData.weight || 70);
            setZone1Max(settingsData.hrZone1Max || 60);
            setZone2Max(settingsData.hrZone2Max || 70);
            setZone3Max(settingsData.hrZone3Max || 80);
            setZone4Max(settingsData.hrZone4Max || 90);
            setRunsPerWeek(settingsData.runsPerWeek || 4);
            setRidesPerWeek(settingsData.ridesPerWeek || 0);
            setStrengthPerWeek(settingsData.strengthPerWeek || 0);
            setWeeklyMileage(settingsData.weeklyMileageGoal || 40);
            setTaperWeeks(settingsData.taperWeeks || 2);
            setPeakWeeks(settingsData.peakWeeks || 4);
            setBuildWeeks(settingsData.buildWeeks || 4);
        }
    }, [settingsData]);

    // Populate goal data for settings mode
    useEffect(() => {
        if (goalsData?.goals?.length > 0) {
            const activeGoal = goalsData.goals.find((g: any) => g.isActive);
            if (activeGoal) {
                setGoalName(activeGoal.name || 'My Race');
                setRaceType(activeGoal.raceType || 'MARATHON');
                if (activeGoal.raceDate) {
                    setRaceDate(new Date(activeGoal.raceDate).toISOString().split('T')[0]);
                }
            }
        }
    }, [goalsData]);

    // Update predicted time when distance or fitness changes
    useEffect(() => {
        if (effectiveVO2max > 0 && calibrationMode === 'manual') {
            const getPredictedTimeForDistance = (dist: string) => {
                const marathonTimes = calculatePredictedTimes(effectiveVO2max, shapePercent);
                const ratios: Record<string, number> = {
                    'MARATHON': 1,
                    'HALF': 0.45,
                    '10K': 0.19,
                    '5K': 0.09,
                };
                return Math.round(marathonTimes.predicted * (ratios[dist] || 1));
            };

            const predictedSeconds = getPredictedTimeForDistance(calibrationDistance);
            const h = Math.floor(predictedSeconds / 3600);
            const m = Math.floor((predictedSeconds % 3600) / 60);
            const s = predictedSeconds % 60;
            setHours(h.toString());
            setMinutes(m.toString());
            setSeconds(s.toString());
        }
    }, [calibrationDistance, effectiveVO2max, shapePercent, calibrationMode]);

    // Auto-fill time when activity is selected
    useEffect(() => {
        if (selectedActivityId && activitiesData?.activities) {
            const activity = activitiesData.activities.find((a: RaceActivity) => a.id === selectedActivityId);
            if (activity) {
                const totalSeconds = activity.movingTime;
                const h = Math.floor(totalSeconds / 3600);
                const m = Math.floor((totalSeconds % 3600) / 60);
                const s = totalSeconds % 60;
                setHours(h.toString());
                setMinutes(m.toString());
                setSeconds(s.toString());

                // Auto-detect distance
                const dist = activity.distance;
                if (dist >= 40000) setCalibrationDistance('MARATHON');
                else if (dist >= 19000) setCalibrationDistance('HALF');
                else if (dist >= 9000) setCalibrationDistance('10K');
                else setCalibrationDistance('5K');
            }
        }
    }, [selectedActivityId, activitiesData]);

    // Onboarding mutation (create goal)
    const createGoalMutation = useMutation({
        mutationFn: async () => {
            const timeSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);

            const res = await fetch('/api/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: goalName,
                    raceType,
                    raceDate,
                    planWeeks: 12,
                    runsPerWeek,
                    ridesPerWeek,
                    strengthPerWeek,
                    taperWeeks,
                    peakWeeks,
                    buildWeeks,
                    // Include calibration data if provided
                    ...(timeSeconds > 0 && {
                        calibrationTime: timeSeconds,
                        calibrationDistance,
                        calibrationActivityId: calibrationMode === 'activity' ? selectedActivityId : undefined,
                    }),
                }),
            });
            if (!res.ok) throw new Error('Failed to create goal');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            queryClient.invalidateQueries({ queryKey: ['plan'] });
            onSuccess();
        },
        onError: (error) => {
            console.error('Goal creation failed:', error);
            setMessage('Failed to create goal. Please try again.');
        }
    });

    // Settings mutation (update settings)
    const updateSettingsMutation = useMutation({
        mutationFn: async () => {
            const timeSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);

            if (timeSeconds === 0) throw new Error('Time cannot be zero');

            const res = await fetch('/api/settings/update-vdot', {
                method: 'POST',
                body: JSON.stringify({
                    timeSeconds,
                    raceDistance: calibrationDistance,
                    runsPerWeek,
                    ridesPerWeek,
                    strengthPerWeek,
                    weeklyMileageGoal: weeklyMileage * 1000,
                    maxHeartRate,
                    restingHeartRate,
                    weight,
                    hrZone1Max: zone1Max,
                    hrZone2Max: zone2Max,
                    hrZone3Max: zone3Max,
                    hrZone4Max: zone4Max,
                    taperWeeks,
                    peakWeeks,
                    buildWeeks,
                }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) throw new Error('Failed to update');
            return res.json();
        },
        onSuccess: (data) => {
            setMessage(`VDOT updated to ${data.vdot.toFixed(1)}! Plan regenerated.`);
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            queryClient.invalidateQueries({ queryKey: ['plan'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
            setTimeout(() => {
                setMessage('');
                onSuccess();
            }, 2000);
        },
        onError: () => {
            setMessage('Error updating settings. Please try again.');
        }
    });

    const handleSubmit = () => {
        if (mode === 'onboarding') {
            createGoalMutation.mutate();
        } else {
            updateSettingsMutation.mutate();
        }
    };

    const isLoading = createGoalMutation.isPending || updateSettingsMutation.isPending;

    const inputClass = "bg-white/5 border border-white/10 rounded-lg p-3 text-white w-full outline-none focus:ring-2 focus:ring-accent-orange transition-all";

    const raceActivities: RaceActivity[] = activitiesData?.activities?.filter((a: RaceActivity) =>
        a.distance >= 4500
    ) || [];

    const formatActivityOption = (activity: RaceActivity) => {
        const date = new Date(activity.startDate).toLocaleDateString();
        const distance = (activity.distance / 1000).toFixed(1);
        const time = formatTime(activity.movingTime);
        return `${activity.name} - ${distance}km in ${time} (${date})`;
    };

    return (
        <div className="space-y-6">
            {/* Target Race - Onboarding Mode */}
            {mode === 'onboarding' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-accent-orange mb-2">
                        <Target className="w-5 h-5" />
                        <h3 className="text-sm font-semibold uppercase tracking-wide">Target Race</h3>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase">Goal Name</label>
                        <input
                            type="text"
                            value={goalName}
                            onChange={(e) => setGoalName(e.target.value)}
                            className={inputClass}
                            placeholder="e.g., Berlin Marathon 2026"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase">Distance</label>
                            <select
                                value={raceType}
                                onChange={(e) => setRaceType(e.target.value)}
                                className={inputClass}
                            >
                                <option value="FIVE_K">5K</option>
                                <option value="TEN_K">10K</option>
                                <option value="HALF_MARATHON">Half Marathon</option>
                                <option value="MARATHON">Marathon</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase">Race Date</label>
                            <input
                                type="date"
                                value={raceDate}
                                onChange={(e) => setRaceDate(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* VDOT Calibration */}
            <div className="border-t border-white/10 pt-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Performance Calibration</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Calibrate your training paces based on a recent race or time trial.
                </p>

                {/* Calibration Mode Toggle */}
                <div className="flex bg-white/5 rounded-lg p-1 mb-4">
                    <button
                        type="button"
                        onClick={() => setCalibrationMode('activity')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${calibrationMode === 'activity'
                            ? 'bg-accent-orange text-white'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Select Activity
                    </button>
                    <button
                        type="button"
                        onClick={() => setCalibrationMode('manual')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${calibrationMode === 'manual'
                            ? 'bg-accent-orange text-white'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Manual Entry
                    </button>
                </div>

                {/* Activity Selection */}
                {calibrationMode === 'activity' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase">Select Race Activity</label>
                            <select
                                value={selectedActivityId}
                                onChange={(e) => setSelectedActivityId(e.target.value)}
                                className={inputClass}
                            >
                                <option value="">-- Select an activity --</option>
                                {raceActivities.map((activity) => (
                                    <option key={activity.id} value={activity.id}>
                                        {formatActivityOption(activity)}
                                    </option>
                                ))}
                            </select>
                            {raceActivities.length === 0 && (
                                <p className="text-xs text-gray-500 mt-2">
                                    No race-eligible activities found. Try manual entry instead.
                                </p>
                            )}
                        </div>

                        {selectedActivityId && (
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 uppercase">Race Distance</label>
                                <select
                                    value={calibrationDistance}
                                    onChange={(e) => setCalibrationDistance(e.target.value)}
                                    className={inputClass}
                                >
                                    <option value="5K">5K</option>
                                    <option value="10K">10K</option>
                                    <option value="HALF">Half Marathon</option>
                                    <option value="MARATHON">Marathon</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Confirm the race distance for accurate VDOT calculation.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Manual Entry */}
                {calibrationMode === 'manual' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase">Distance</label>
                            <select
                                value={calibrationDistance}
                                onChange={(e) => setCalibrationDistance(e.target.value)}
                                className={inputClass}
                            >
                                <option value="5K">5K</option>
                                <option value="10K">10K</option>
                                <option value="HALF">Half Marathon</option>
                                <option value="MARATHON">Marathon</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 uppercase">Hours</label>
                                <input
                                    type="number"
                                    value={hours}
                                    onChange={e => setHours(e.target.value)}
                                    className={inputClass}
                                    min="0"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 uppercase">Mins</label>
                                <input
                                    type="number"
                                    value={minutes}
                                    onChange={e => setMinutes(e.target.value)}
                                    className={inputClass}
                                    min="0"
                                    max="59"
                                    placeholder="00"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 uppercase">Secs</label>
                                <input
                                    type="number"
                                    value={seconds}
                                    onChange={e => setSeconds(e.target.value)}
                                    className={inputClass}
                                    min="0"
                                    max="59"
                                    placeholder="00"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Goal Time Recommendation Slider */}
                {effectiveVO2max > 0 && (
                    <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                                ⏱️ Recommended Goal Time
                            </h4>
                            <div className="text-right">
                                <span className="text-accent-orange font-bold text-sm block">
                                    {formatTime((parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0))}
                                </span>
                                <span className="text-[10px] text-gray-500 block">Enter manually or use slider</span>
                            </div>
                        </div>
                        <input
                            type="range"
                            min={calculatePredictedTimes(effectiveVO2max, 100).optimal} // Fastest (100% shape)
                            max={Math.round(calculatePredictedTimes(effectiveVO2max, 0).predicted * 1.05)} // Slowest (0% shape + 5% buffer)
                            step="60" // 1 minute steps
                            value={(parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0)}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent-orange mb-2"
                            onChange={(e) => {
                                const secs = parseInt(e.target.value);
                                const h = Math.floor(secs / 3600);
                                const m = Math.floor((secs % 3600) / 60);
                                const s = secs % 60;
                                setHours(h.toString());
                                setMinutes(m.toString());
                                setSeconds(s.toString());
                            }}
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>{formatTime(calculatePredictedTimes(effectiveVO2max, 100).optimal)} (Optimal)</span>
                            <span>{formatTime(Math.round(calculatePredictedTimes(effectiveVO2max, 0).predicted * 1.05))} (Conservative)</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Plan Volume */}
            <div className="border-t border-white/10 pt-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Plan Volume</h3>

                {/* Runs Per Week */}
                <div className="mb-6">
                    <div className="flex justify-between mb-2">
                        <label className="text-xs text-gray-400 uppercase flex items-center gap-1">
                            <Activity className="w-3 h-3" /> Runs / Week
                        </label>
                        <span className="text-accent-orange font-bold">{runsPerWeek}</span>
                    </div>
                    <input
                        type="range"
                        min="2"
                        max="6"
                        value={runsPerWeek}
                        onChange={(e) => setRunsPerWeek(parseInt(e.target.value))}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent-orange"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>2</span>
                        <span>4</span>
                        <span>6</span>
                    </div>
                </div>

                {/* Rides Per Week */}
                <div className="mb-6">
                    <div className="flex justify-between mb-2">
                        <label className="text-xs text-gray-400 uppercase flex items-center gap-1">
                            <Bike className="w-3 h-3" /> Rides / Week
                        </label>
                        <span className="text-accent-cyan font-bold">{ridesPerWeek}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="3"
                        value={ridesPerWeek}
                        onChange={(e) => setRidesPerWeek(parseInt(e.target.value))}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent-cyan"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0</span>
                        <span>1</span>
                        <span>2</span>
                        <span>3</span>
                    </div>
                </div>

                {/* Strength Per Week */}
                <div className="mb-6">
                    <div className="flex justify-between mb-2">
                        <label className="text-xs text-gray-400 uppercase flex items-center gap-1">
                            💪 Strength / Week
                        </label>
                        <span className="text-purple-400 font-bold">{strengthPerWeek}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="4"
                        value={strengthPerWeek}
                        onChange={(e) => setStrengthPerWeek(parseInt(e.target.value))}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0</span>
                        <span>2</span>
                        <span>4</span>
                    </div>
                </div>

                {/* Peak Mileage */}
                <div className="mb-4">
                    <div className="flex justify-between mb-2">
                        <label className="text-xs text-gray-400 uppercase flex items-center gap-1">
                            <Move className="w-3 h-3" /> Peak Mileage Goal
                        </label>
                        <span className="text-green-400 font-bold">{weeklyMileage} km</span>
                    </div>
                    <input
                        type="range"
                        min="20"
                        max="100"
                        step="5"
                        value={weeklyMileage}
                        onChange={(e) => setWeeklyMileage(parseInt(e.target.value))}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>20km</span>
                        <span>60km</span>
                        <span>100km</span>
                    </div>
                </div>
            </div>

            {/* Training Phases */}
            <div className="border-t border-white/10 pt-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Training Phases</h3>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-xs text-gray-400 uppercase">Taper</label>
                            <span className="text-teal-400 font-bold">{taperWeeks}w</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="3"
                            value={taperWeeks}
                            onChange={(e) => setTaperWeeks(parseInt(e.target.value))}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-teal-500"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-xs text-gray-400 uppercase">Peak</label>
                            <span className="text-purple-400 font-bold">{peakWeeks}w</span>
                        </div>
                        <input
                            type="range"
                            min="2"
                            max="6"
                            value={peakWeeks}
                            onChange={(e) => setPeakWeeks(parseInt(e.target.value))}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-xs text-gray-400 uppercase">Build</label>
                            <span className="text-orange-400 font-bold">{buildWeeks}w</span>
                        </div>
                        <input
                            type="range"
                            min="2"
                            max="8"
                            value={buildWeeks}
                            onChange={(e) => setBuildWeeks(parseInt(e.target.value))}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                    </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Remaining weeks will be Base phase.</p>
            </div>

            {/* Heart Rate Settings (Collapsible) */}
            <div className="border-t border-white/10 pt-4">
                <button
                    type="button"
                    onClick={() => setShowHeartRate(!showHeartRate)}
                    className="flex items-center justify-between w-full text-left py-2"
                >
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Heart Rate Settings</h3>
                    {showHeartRate ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                </button>

                {showHeartRate && (
                    <div className="space-y-4 mt-4 animate-fade-in">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 uppercase">Max HR</label>
                                <input
                                    type="number"
                                    value={maxHeartRate}
                                    onChange={e => setMaxHeartRate(parseInt(e.target.value) || 185)}
                                    className={inputClass}
                                    min="130"
                                    max="220"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 uppercase">Resting HR</label>
                                <input
                                    type="number"
                                    value={restingHeartRate}
                                    onChange={e => setRestingHeartRate(parseInt(e.target.value) || 55)}
                                    className={inputClass}
                                    min="35"
                                    max="90"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 uppercase">Weight (kg)</label>
                                <input
                                    type="number"
                                    value={weight}
                                    onChange={e => setWeight(parseInt(e.target.value) || 70)}
                                    className={inputClass}
                                    min="30"
                                    max="150"
                                />
                            </div>
                        </div>

                        <div>
                            <p className="text-xs text-gray-500 mb-3">Zone thresholds (% of Max HR)</p>
                            <div className="grid grid-cols-4 gap-2">
                                <div>
                                    <label className="block text-xs text-green-400 mb-1 text-center">Z1 Max</label>
                                    <input
                                        type="number"
                                        value={zone1Max}
                                        onChange={e => setZone1Max(parseInt(e.target.value) || 60)}
                                        className={`${inputClass} text-center text-sm`}
                                        min="50" max="70"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-blue-400 mb-1 text-center">Z2 Max</label>
                                    <input
                                        type="number"
                                        value={zone2Max}
                                        onChange={e => setZone2Max(parseInt(e.target.value) || 70)}
                                        className={`${inputClass} text-center text-sm`}
                                        min="60" max="80"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-amber-400 mb-1 text-center">Z3 Max</label>
                                    <input
                                        type="number"
                                        value={zone3Max}
                                        onChange={e => setZone3Max(parseInt(e.target.value) || 80)}
                                        className={`${inputClass} text-center text-sm`}
                                        min="70" max="90"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-red-400 mb-1 text-center">Z4 Max</label>
                                    <input
                                        type="number"
                                        value={zone4Max}
                                        onChange={e => setZone4Max(parseInt(e.target.value) || 90)}
                                        className={`${inputClass} text-center text-sm`}
                                        min="80" max="100"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-600 mt-2">Z5 = above Z4 Max</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Message */}
            {message && (
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.includes('Error') || message.includes('Failed')
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-green-500/10 text-green-400'
                    }`}>
                    <AlertCircle className="w-4 h-4" />
                    {message}
                </div>
            )}

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg font-bold"
            >
                {isLoading ? (
                    <>
                        <Save className="animate-spin w-5 h-5" />
                        {mode === 'onboarding' ? 'Generating Plan...' : 'Updating...'}
                    </>
                ) : (
                    <>
                        <Check className="w-5 h-5" />
                        {mode === 'onboarding' ? 'Generate Training Plan' : 'Save & Regenerate Plan'}
                    </>
                )}
            </button>

            {mode === 'settings' && (
                <p className="text-xs text-gray-500 text-center">
                    Adjusting settings will regenerate future workouts. Completed workouts are preserved.
                </p>
            )}
        </div>
    );
}
