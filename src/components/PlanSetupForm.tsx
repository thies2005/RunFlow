'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
    Activity, Bike, Move, ChevronDown, ChevronUp,
    AlertCircle, Save, Check, Calendar, Target, TrendingUp
} from 'lucide-react';
import { calculatePredictedTimes, calculateAllRacePredictions } from '@/lib/metrics/runalyze';
import { formatTime, calculateVdot, predictRaceTime, type RaceDistance, DISTANCES } from '@/lib/metrics/vdot';
import {
    calculateProjectedGoalTime,
    calculateWeeksUntilRace,
    type PlanSettings,
    type ProjectedGoalResult
} from '@/lib/metrics/goalProjection';

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
    effectiveVO2max: propEffectiveVO2max = 0,
    shapePercent: propShapePercent = 0
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

    // Goal Time State (editable)
    const [goalTimeSeconds, setGoalTimeSeconds] = useState<number | null>(null);
    const [isEditingGoalTime, setIsEditingGoalTime] = useState(false);
    const [goalTimeHours, setGoalTimeHours] = useState('');
    const [goalTimeMinutes, setGoalTimeMinutes] = useState('');
    const [goalTimeSecs, setGoalTimeSecs] = useState('');

    // Calibration Result
    const [calibrationFactor, setCalibrationFactor] = useState<number>(1.0);

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

    // Fetch analytics stats (for both modes to get effectiveVO2max if not passed)
    const { data: internalStatsData } = useQuery({
        queryKey: ['analytics-stats'],
        queryFn: async () => {
            const res = await fetch('/api/analytics/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        },
    });

    // Use props if provided, otherwise fall back to internally fetched stats
    const effectiveVO2max = propEffectiveVO2max > 0 ? propEffectiveVO2max : (internalStatsData?.effectiveVO2max || 0);
    const shapePercent = propShapePercent > 0 ? propShapePercent : (internalStatsData?.marathonShape?.shape || 0);

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

    // Update predicted time when distance or fitness changes (Manual Mode)
    useEffect(() => {
        if (effectiveVO2max > 0 && calibrationMode === 'manual' && !selectedActivityId) {
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
            // Only update if not already set (to avoid overwriting user input)
            if (!hours && !minutes && !seconds) {
                setHours(h.toString());
                setMinutes(m.toString());
                setSeconds(s.toString());
            }
        }
    }, [calibrationDistance, effectiveVO2max, shapePercent, calibrationMode]);

    // Auto-fill time when activity is selected (Activity Mode)
    useEffect(() => {
        if (selectedActivityId && activitiesData?.activities) {
            const activity = activitiesData.activities.find((a: RaceActivity) => a.id === selectedActivityId);
            if (activity) {
                const targetMeters = DISTANCES[calibrationDistance as RaceDistance] || 42195;
                // If activity distance is within 15% of target distance, assume it's a correction (e.g. GPS error)
                // Otherwise treat it as a projection from one distance to another
                const isCorrection = Math.abs(activity.distance - targetMeters) < (targetMeters * 0.15);

                let vdot: number;
                let displaySeconds: number;

                if (isCorrection) {
                    // CORRECTION: activity was actually this distance
                    // Use the calibration distance + activity time to calculate VDOT
                    vdot = calculateVdot({
                        distance: calibrationDistance as any,
                        timeSeconds: activity.movingTime
                    });
                    displaySeconds = activity.movingTime;
                } else {
                    // PROJECTION: activity was what it says it was
                    // 1. Calculate VDOT from this activity's actual distance
                    vdot = calculateVdot({
                        distance: activity.distance,
                        timeSeconds: activity.movingTime
                    });

                    // 2. Predict time for the selected Calibration Distance
                    displaySeconds = predictRaceTime(vdot, calibrationDistance as any);
                }

                const h = Math.floor(displaySeconds / 3600);
                const m = Math.floor((displaySeconds % 3600) / 60);
                const s = displaySeconds % 60;
                setHours(h.toString());
                setMinutes(m.toString());
                setSeconds(s.toString());

                // 3. Update Calibration Factor
                if (effectiveVO2max > 0) {
                    setCalibrationFactor(vdot / effectiveVO2max);
                }
            }
        }
    }, [selectedActivityId, activitiesData, calibrationDistance, effectiveVO2max]); // Re-run when dist changes

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
                    weeklyMileageGoal: weeklyMileage * 1000, // Convert km to meters
                    // Include user-selected goal time if set
                    ...(goalTimeSeconds && { targetTime: goalTimeSeconds }),
                    // Include calibration data if provided
                    ...(timeSeconds > 0 && {
                        calibrationTime: timeSeconds,
                        calibrationDistance,
                        calibrationActivityId: calibrationMode === 'activity' ? selectedActivityId : undefined,
                        calibrationFactor,
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
                    calibrationFactor,
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
    const [isEditingTime, setIsEditingTime] = useState(false);

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

            {/* Performance Calibration - First so it can feed into Goal Time */}
            <div className="border-t border-white/10 pt-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Performance Calibration</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Fine-tune predictions based on a recent race or time trial result.
                </p>

                {/* Calibration Mode Toggle */}
                <div className="flex bg-white/5 rounded-lg p-1 mb-4">
                    <button
                        type="button"
                        onClick={() => {
                            setCalibrationMode('activity');
                            setHours(''); setMinutes(''); setSeconds('');
                            setCalibrationFactor(1.0);
                        }}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${calibrationMode === 'activity'
                            ? 'bg-accent-orange text-white'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Select Activity
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setCalibrationMode('manual');
                            setSelectedActivityId('');
                        }}
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
                            </div>
                        )}
                    </div>
                )}

                {/* Manual Entry */}
                {calibrationMode === 'manual' && (
                    <div className="space-y-4">
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
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase">Your Race Time</label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="number"
                                    className="w-16 bg-white/5 border border-white/10 rounded-lg p-3 text-white text-center"
                                    placeholder="HH"
                                    value={hours}
                                    onChange={e => {
                                        setHours(e.target.value);
                                        // Auto-update calibration factor
                                        const secs = (parseInt(e.target.value) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
                                        if (secs > 0 && effectiveVO2max > 0) {
                                            const raceVdot = calculateVdot({ distance: calibrationDistance as any, timeSeconds: secs });
                                            setCalibrationFactor(raceVdot / effectiveVO2max);
                                        }
                                    }}
                                    min="0"
                                />
                                <span className="text-white">:</span>
                                <input
                                    type="number"
                                    className="w-16 bg-white/5 border border-white/10 rounded-lg p-3 text-white text-center"
                                    placeholder="MM"
                                    value={minutes}
                                    onChange={e => {
                                        setMinutes(e.target.value);
                                        const secs = (parseInt(hours) || 0) * 3600 + (parseInt(e.target.value) || 0) * 60 + (parseInt(seconds) || 0);
                                        if (secs > 0 && effectiveVO2max > 0) {
                                            const raceVdot = calculateVdot({ distance: calibrationDistance as any, timeSeconds: secs });
                                            setCalibrationFactor(raceVdot / effectiveVO2max);
                                        }
                                    }}
                                    min="0"
                                    max="59"
                                />
                                <span className="text-white">:</span>
                                <input
                                    type="number"
                                    className="w-16 bg-white/5 border border-white/10 rounded-lg p-3 text-white text-center"
                                    placeholder="SS"
                                    value={seconds}
                                    onChange={e => {
                                        setSeconds(e.target.value);
                                        const secs = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(e.target.value) || 0);
                                        if (secs > 0 && effectiveVO2max > 0) {
                                            const raceVdot = calculateVdot({ distance: calibrationDistance as any, timeSeconds: secs });
                                            setCalibrationFactor(raceVdot / effectiveVO2max);
                                        }
                                    }}
                                    min="0"
                                    max="59"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Calibration Result */}
                {(() => {
                    const currentSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);

                    if (currentSeconds <= 0 && !selectedActivityId) {
                        return null;
                    }

                    // Calculate VDOT from the race performance
                    const raceVdot = currentSeconds > 0
                        ? calculateVdot({ distance: calibrationDistance as any, timeSeconds: currentSeconds })
                        : 0;

                    // Calculate calibration factor: actual performance / expected performance
                    const factor = effectiveVO2max > 0 ? raceVdot / effectiveVO2max : 1.0;
                    const factorPercent = ((factor - 1) * 100);

                    const distanceName = calibrationDistance === 'HALF' ? 'Half Marathon' :
                        calibrationDistance === 'MARATHON' ? 'Marathon' : calibrationDistance;

                    if (currentSeconds <= 0) return null;

                    return (
                        <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                            <h4 className="text-xs font-semibold text-gray-300 mb-3">
                                📊 Calibration Result
                            </h4>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-400">Your {distanceName} VDOT:</span>
                                    <span className="text-lg font-bold text-accent-cyan">{raceVdot.toFixed(1)}</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-400">Training VO2max:</span>
                                    <span className="text-sm text-white">{effectiveVO2max.toFixed(1)}</span>
                                </div>

                                <div className="border-t border-white/10 pt-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-400">Calibrated VO2max:</span>
                                        <span className={`text-lg font-bold ${factorPercent >= 0 ? 'text-green-400' : 'text-amber-400'}`}>
                                            {raceVdot.toFixed(1)} ({factorPercent >= 0 ? '+' : ''}{factorPercent.toFixed(1)}%)
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {factorPercent >= 5 ? (
                                            <>🚀 Race performance exceeds training predictions. Goal times adjusted accordingly.</>
                                        ) : factorPercent >= 0 ? (
                                            <>✅ Your race performance aligns well with training fitness.</>
                                        ) : factorPercent >= -5 ? (
                                            <>📊 Race was slightly slower than predicted. Goal times adjusted.</>
                                        ) : (
                                            <>⚠️ Significant gap between training and race. Check conditions or use manual goal.</>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Dynamic Goal Race Time - Uses calibrated VO2max */}
            {mode === 'onboarding' && effectiveVO2max > 0 && (() => {
                // Map raceType enum to RaceDistance
                const raceDistanceMap: Record<string, RaceDistance> = {
                    'FIVE_K': '5K',
                    'TEN_K': '10K',
                    'HALF_MARATHON': 'HALF',
                    'MARATHON': 'MARATHON',
                };
                const mappedDistance = raceDistanceMap[raceType] || 'MARATHON';

                // Calculate weeks until race
                const weeksUntilRace = calculateWeeksUntilRace(new Date(raceDate));

                // Use calibrated VO2max if calibration has been done
                const calibratedVO2max = effectiveVO2max * calibrationFactor;

                // Build plan settings from form state
                const planSettings: PlanSettings = {
                    durationWeeks: weeksUntilRace,
                    runsPerWeek: runsPerWeek,
                    weeklyMileageGoal: weeklyMileage,
                    raceDistance: mappedDistance,
                    taperWeeks: taperWeeks,
                    peakWeeks: peakWeeks,
                    buildWeeks: buildWeeks,
                };

                // Calculate projection using calibrated VO2max
                const projection = calculateProjectedGoalTime(
                    calibratedVO2max,
                    planSettings,
                    shapePercent
                );

                const distanceName = mappedDistance === 'HALF' ? 'Half Marathon' :
                    mappedDistance === 'MARATHON' ? 'Marathon' : mappedDistance;

                // Use user-selected goal time if set, otherwise default to projected
                const displayGoalTime = goalTimeSeconds ?? projection.projectedTime;

                // Calculate slider range (extend beyond optimal/conservative for manual entry flexibility)
                const sliderMin = Math.round(projection.optimalTime * 0.9); // 10% faster than optimal
                const sliderMax = Math.round(projection.conservativeTime * 1.1); // 10% slower than conservative

                // Handle goal time updates from slider
                const handleSliderChange = (value: number) => {
                    setGoalTimeSeconds(value);
                    const h = Math.floor(value / 3600);
                    const m = Math.floor((value % 3600) / 60);
                    const s = value % 60;
                    setGoalTimeHours(h.toString());
                    setGoalTimeMinutes(m.toString());
                    setGoalTimeSecs(s.toString());
                };

                // Handle manual time entry confirmation
                const confirmManualEntry = () => {
                    const totalSecs = (parseInt(goalTimeHours) || 0) * 3600 +
                        (parseInt(goalTimeMinutes) || 0) * 60 +
                        (parseInt(goalTimeSecs) || 0);
                    if (totalSecs > 0) {
                        setGoalTimeSeconds(totalSecs);
                    }
                    setIsEditingGoalTime(false);
                };

                // Start editing with current values
                const startEditing = () => {
                    const time = displayGoalTime;
                    setGoalTimeHours(Math.floor(time / 3600).toString());
                    setGoalTimeMinutes(Math.floor((time % 3600) / 60).toString());
                    setGoalTimeSecs((time % 60).toString());
                    setIsEditingGoalTime(true);
                };

                // Reset to projected
                const resetToProjected = () => {
                    setGoalTimeSeconds(null);
                    setIsEditingGoalTime(false);
                };

                return (
                    <div className="mt-6 p-5 bg-gradient-to-br from-accent-orange/10 via-transparent to-accent-cyan/5 rounded-xl border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-accent-orange">
                                <Target className="w-5 h-5" />
                                <h3 className="text-sm font-semibold uppercase tracking-wide">Goal {distanceName} Time</h3>
                            </div>
                            {goalTimeSeconds !== null && (
                                <button
                                    onClick={resetToProjected}
                                    className="text-xs text-gray-500 hover:text-accent-cyan transition-colors"
                                >
                                    Reset to projected
                                </button>
                            )}
                        </div>

                        {/* Show calibration indicator if applied */}
                        {calibrationFactor !== 1.0 && (
                            <div className="mb-3 text-xs text-accent-cyan bg-accent-cyan/10 px-2 py-1 rounded inline-block">
                                ✓ Using calibrated VO2max ({(effectiveVO2max * calibrationFactor).toFixed(1)})
                            </div>
                        )}

                        {/* Editable Goal Time Display */}
                        <div className="text-center mb-4">
                            {isEditingGoalTime ? (
                                <div className="flex items-center justify-center gap-1 mb-2">
                                    <input
                                        type="number"
                                        className="w-12 bg-black/40 border border-white/20 rounded p-2 text-center text-2xl font-bold"
                                        placeholder="H"
                                        value={goalTimeHours}
                                        onChange={e => setGoalTimeHours(e.target.value)}
                                        min="0"
                                        max="9"
                                    />
                                    <span className="text-2xl text-white">:</span>
                                    <input
                                        type="number"
                                        className="w-12 bg-black/40 border border-white/20 rounded p-2 text-center text-2xl font-bold"
                                        placeholder="MM"
                                        value={goalTimeMinutes}
                                        onChange={e => setGoalTimeMinutes(e.target.value)}
                                        min="0"
                                        max="59"
                                    />
                                    <span className="text-2xl text-white">:</span>
                                    <input
                                        type="number"
                                        className="w-12 bg-black/40 border border-white/20 rounded p-2 text-center text-2xl font-bold"
                                        placeholder="SS"
                                        value={goalTimeSecs}
                                        onChange={e => setGoalTimeSecs(e.target.value)}
                                        min="0"
                                        max="59"
                                    />
                                    <button
                                        onClick={confirmManualEntry}
                                        className="ml-2 p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                                    >
                                        <Check className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={startEditing}
                                    className="group hover:bg-white/5 p-2 rounded-lg transition-colors"
                                >
                                    <div className="text-3xl font-bold text-white mb-1 group-hover:text-accent-orange transition-colors">
                                        {formatTime(displayGoalTime)}
                                    </div>
                                    <span className="text-xs text-gray-500 group-hover:text-gray-400">
                                        Click to edit manually
                                    </span>
                                </button>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                                {goalTimeSeconds !== null ? (
                                    <span className="text-accent-orange">Custom goal</span>
                                ) : (
                                    <>Projected based on {weeksUntilRace} weeks of training</>
                                )}
                            </p>
                        </div>

                        {/* Interactive Slider */}
                        <div className="mb-4">
                            <input
                                type="range"
                                min={sliderMin}
                                max={sliderMax}
                                step="30"
                                value={displayGoalTime}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent-orange"
                                onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span className="text-green-400">{formatTime(projection.optimalTime)} (Optimal)</span>
                                <span className="text-accent-orange">{formatTime(projection.conservativeTime)} (Conservative)</span>
                            </div>
                        </div>

                        {/* Improvement Stats */}
                        <div className="grid grid-cols-2 gap-3 text-xs bg-white/5 rounded-lg p-3">
                            <div>
                                <span className="text-gray-400 block mb-1">VO2max</span>
                                <span className="text-white font-semibold">{calibratedVO2max.toFixed(1)}</span>
                                <span className="text-gray-500"> → </span>
                                <span className="text-accent-cyan font-semibold">{projection.projectedVdot}</span>
                                {projection.improvementPercent > 0 && (
                                    <span className="text-green-400 ml-1">(+{projection.improvementPercent}%)</span>
                                )}
                            </div>
                            <div>
                                <span className="text-gray-400 block mb-1">Marathon Shape</span>
                                <span className="text-white font-semibold">{shapePercent}%</span>
                                <span className="text-gray-500"> → </span>
                                <span className="text-accent-cyan font-semibold">{projection.projectedShape}%</span>
                                {projection.shapeImprovementPercent > 0 && (
                                    <span className="text-green-400 ml-1">(+{projection.shapeImprovementPercent.toFixed(1)}%)</span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

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
