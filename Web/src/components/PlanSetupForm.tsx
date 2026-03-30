'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Activity, Bike, Move, ChevronDown, ChevronUp,
    AlertCircle, AlertTriangle, Save, Check, Target, Waves, Dumbbell, Rocket, BarChart2
} from 'lucide-react';
import { calculateAllRacePredictions } from '@/lib/metrics/runalyze';
import { formatTime, calculateVdot, predictRaceTime, type RaceDistance, DISTANCES } from '@/lib/metrics/vdot';
import {
    calculateProjectedGoalTime,
    type PlanSettings
} from '@/lib/metrics/goalProjection';
import TargetRaceSection from './setup/TargetRaceSection';
import CalibrationSection from './setup/CalibrationSection';
import GoalTimeRenderer from './setup/GoalTimeRenderer';
import PlanVolumeSection from './setup/PlanVolumeSection';
import HeartRateZonesSection from './setup/HeartRateZonesSection';


interface RaceActivity {
    id: string;
    name: string;
    distance: number;
    movingTime: number;
    startDate: string;
}

interface PlanSetupFormProps {
    mode: 'onboarding' | 'settings';
    onSuccess?: () => void;
    onCancel?: () => void;
    effectiveVO2max?: number;
    shapePercent?: number;
}

export default function PlanSetupForm({
    mode,
    onSuccess,
    effectiveVO2max: propEffectiveVO2max = 0,
    shapePercent: propShapePercent = 0
}: PlanSetupFormProps) {
    const queryClient = useQueryClient();

    // Target Race (onboarding only)
    const [goalName, setGoalName] = useState('My First Race');
    const [raceType, setRaceType] = useState('MARATHON');
    const [raceDate, setRaceDate] = useState(
        new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [planStartDate, setPlanStartDate] = useState(
        new Date().toISOString().split('T')[0]
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
    const [swimsPerWeek, setSwimsPerWeek] = useState(0);
    const [strengthPerWeek, setStrengthPerWeek] = useState(0);
    const [weeklyMileage, setWeeklyMileage] = useState(40);

    // Phase Settings
    const [taperWeeks, setTaperWeeks] = useState(2);
    const [peakWeeks, setPeakWeeks] = useState(4);
    const [buildWeeks, setBuildWeeks] = useState(4);

    // Workout Day Scheduling (hidden/advanced section)
    const [showSchedulingSettings, setShowSchedulingSettings] = useState(false);
    const [longRunDay, setLongRunDay] = useState(0); // 0 = Sunday
    const [qualityDay, setQualityDay] = useState(3); // 3 = Wednesday
    const [restDays, setRestDays] = useState<number[]>([1, 5]); // 1 = Monday, 5 = Friday

    // Heart Rate (visible by default now)
    const [showHeartRate, setShowHeartRate] = useState(true);
    const [maxHeartRate, setMaxHeartRate] = useState(185);
    const [restingHeartRate, setRestingHeartRate] = useState(55);
    const [weight, setWeight] = useState(70);
    const [zone1Max, setZone1Max] = useState(60);
    const [zone2Max, setZone2Max] = useState(70);
    const [zone3Max, setZone3Max] = useState(80);
    const [zone4Max, setZone4Max] = useState(90);
    const [zone5Max, setZone5Max] = useState(95);
    const [zone6Max, setZone6Max] = useState(100);

    // Threshold values for zone calculation
    const [thresholdHR, setThresholdHR] = useState<string>('');
    const [thresholdPaceMin, setThresholdPaceMin] = useState<string>('');
    const [thresholdPaceSec, setThresholdPaceSec] = useState<string>('');

    // Calculated 7 zones from LTHR
    const [calculatedZones, setCalculatedZones] = useState<{ label: string; min: number; max: number }[]>([]);

    // Goal Time State (editable)
    const [goalTimeSeconds, setGoalTimeSeconds] = useState<number | null>(null);
    const [isEditingGoalTime, setIsEditingGoalTime] = useState(false);
    const [goalTimeHours, setGoalTimeHours] = useState('');
    const [goalTimeMinutes, setGoalTimeMinutes] = useState('');
    const [goalTimeSecs, setGoalTimeSecs] = useState('');

    // Calibration Result
    const [calibrationFactor, setCalibrationFactor] = useState<number>(1.0);
    const lastAutoTime = useRef<number>(0);

    const [message, setMessage] = useState('');
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
            setZone5Max(settingsData.hrZone5Max || 95);
            setZone6Max(settingsData.hrZone6Max || 100);
            setRunsPerWeek(settingsData.runsPerWeek || 4);
            setRidesPerWeek(settingsData.ridesPerWeek || 0);
            setSwimsPerWeek(settingsData.swimsPerWeek || 0);
            setStrengthPerWeek(settingsData.strengthPerWeek || 0);
            setWeeklyMileage(settingsData.weeklyMileageGoal || 40);
            setTaperWeeks(settingsData.taperWeeks || 2);
            setPeakWeeks(settingsData.peakWeeks || 4);
            setBuildWeeks(settingsData.buildWeeks || 4);
            // Scheduling preferences
            setLongRunDay(settingsData.longRunDay ?? 0);
            setQualityDay(settingsData.qualityDay ?? 3);
            if (Array.isArray(settingsData.restDays)) {
                setRestDays(settingsData.restDays);
            }
            // Threshold values
            if (settingsData.thresholdHeartRate) {
                setThresholdHR(settingsData.thresholdHeartRate.toString());
            }
            if (settingsData.thresholdPace) {
                const paceSeconds = settingsData.thresholdPace;
                setThresholdPaceMin(Math.floor(paceSeconds / 60).toString());
                setThresholdPaceSec((paceSeconds % 60).toString().padStart(2, '0'));
            }
        }
    }, [settingsData]);

    // Auto-calculate 7 zones from LTHR
    useEffect(() => {
        const lthr = parseInt(thresholdHR);
        if (!isNaN(lthr) && lthr > 0) {
            setCalculatedZones([
                { label: 'Z1 Recovery', min: 0, max: Math.round(lthr * 0.75) },
                { label: 'Z2 Aerobic', min: Math.round(lthr * 0.75) + 1, max: Math.round(lthr * 0.87) },
                { label: 'Z3 Tempo', min: Math.round(lthr * 0.87) + 1, max: Math.round(lthr * 0.94) },
                { label: 'Z4 Threshold', min: Math.round(lthr * 0.94) + 1, max: lthr },
                { label: 'Z5 VO2max', min: lthr + 1, max: Math.round(lthr * 1.05) },
                { label: 'Z6 Anaerobic', min: Math.round(lthr * 1.05) + 1, max: Math.round(lthr * 1.10) },
                { label: 'Z7 Neuromuscular', min: Math.round(lthr * 1.10) + 1, max: 999 },
            ]);
        } else {
            setCalculatedZones([]);
        }
    }, [thresholdHR]);

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
                const predictions = calculateAllRacePredictions(effectiveVO2max, shapePercent);
                const mapping: Record<string, string> = {
                    'MARATHON': 'Marathon',
                    'HALF': 'Half',
                    '10K': '10K',
                    '5K': '5K'
                };
                const pred = predictions.find(p => p.distance === mapping[dist]);
                return pred ? Math.round(pred.predicted) : 0;
            };

            const predictedSeconds = getPredictedTimeForDistance(calibrationDistance);
            if (predictedSeconds === 0) return;

            // Current form seconds
            const currentSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);

            // Only update if current time is zero OR matches our last auto-fill (user hasn't manually edited it significantly)
            if (currentSeconds === 0 || currentSeconds === lastAutoTime.current) {
                const h = Math.floor(predictedSeconds / 3600);
                const m = Math.floor((predictedSeconds % 3600) / 60);
                const s = predictedSeconds % 60;

                setHours(h > 0 ? h.toString() : '');
                setMinutes(m.toString().padStart(2, '0'));
                setSeconds(s.toString().padStart(2, '0'));
                lastAutoTime.current = predictedSeconds;

                // Also update calibration factor to 1.0 since we are using the predicted time
                setCalibrationFactor(1.0);
            }
        }
        // hours/minutes/seconds intentionally excluded — reading current form values
        // to avoid overwriting user edits; adding them would cause infinite re-renders
    }, [calibrationDistance, effectiveVO2max, shapePercent, calibrationMode, selectedActivityId]);

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

    // Auto-calculate dynamic Plan Weeks
    const msPerWeek: number = 1000 * 60 * 60 * 24 * 7;
    const computedPlanWeeks: number = Math.max(4, Math.floor((new Date(raceDate).getTime() - new Date(planStartDate).getTime()) / msPerWeek));

    // Clamp Training Phases if they exceed available plan weeks
    useEffect(() => {
        if (taperWeeks + peakWeeks + buildWeeks > computedPlanWeeks) {
            const sum = taperWeeks + peakWeeks + buildWeeks;
            let newTaper = Math.max(1, Math.round((taperWeeks / sum) * computedPlanWeeks));
            let newPeak = Math.max(1, Math.round((peakWeeks / sum) * computedPlanWeeks));
            let newBuild = computedPlanWeeks - newTaper - newPeak;

            if (newBuild < 0) {
                newBuild = 0;
                newPeak = Math.max(1, computedPlanWeeks - newTaper);
                if (newTaper + newPeak > computedPlanWeeks) {
                    newTaper = Math.max(0, computedPlanWeeks - newPeak);
                }
            }

            setTaperWeeks(newTaper);
            setPeakWeeks(newPeak);
            setBuildWeeks(newBuild);
        }
    }, [computedPlanWeeks, taperWeeks, peakWeeks, buildWeeks]);

    // Onboarding mutation (create goal)
    const createGoalMutation = useMutation({
        mutationFn: async () => {
            const timeSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);

            // Calculate the displayed goal time (either user-selected or projected)
            // This ensures we always save a targetTime to the goal
            let computedTargetTime: number | null = goalTimeSeconds;
            if (!computedTargetTime && effectiveVO2max > 0) {
                // Compute projection inline if no goal time was explicitly set
                const raceDistanceMap: Record<string, RaceDistance> = {
                    'FIVE_K': '5K',
                    'TEN_K': '10K',
                    'HALF_MARATHON': 'HALF',
                    'MARATHON': 'MARATHON',
                };
                const mappedDistance = raceDistanceMap[raceType] || 'MARATHON';
                const calibratedVO2max = effectiveVO2max * calibrationFactor;
                const planSettings: PlanSettings = {
                    durationWeeks: computedPlanWeeks,
                    runsPerWeek: runsPerWeek,
                    weeklyMileageGoal: weeklyMileage,
                    raceDistance: mappedDistance,
                    taperWeeks: taperWeeks,
                    peakWeeks: peakWeeks,
                    buildWeeks: buildWeeks,
                };
                const projection = calculateProjectedGoalTime(calibratedVO2max, planSettings, shapePercent);
                computedTargetTime = projection.projectedTime;
            }

            const res = await fetch('/api/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: goalName,
                    raceType,
                    raceDate: new Date(raceDate).toISOString(),
                    planStartDate: new Date(planStartDate).toISOString(),
                    planWeeks: Math.max(4, Math.floor((new Date(raceDate).getTime() - new Date(planStartDate).getTime()) / (1000 * 60 * 60 * 24 * 7))),
                    runsPerWeek,
                    ridesPerWeek,
                    swimsPerWeek,
                    strengthPerWeek,
                    taperWeeks,
                    peakWeeks,
                    buildWeeks,
                    weeklyMileageGoal: weeklyMileage * 1000, // Convert km to meters
                    // Always include the computed goal time (ensure integer)
                    ...(computedTargetTime && { targetTime: Math.round(computedTargetTime) }),
                    // Include calibration data if provided (ensure integer times)
                    ...(timeSeconds > 0 && {
                        calibrationTime: Math.round(timeSeconds),
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
            if (typeof window !== 'undefined') {
                localStorage.removeItem('runflow_onboarding_dismissed');
            }
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            queryClient.invalidateQueries({ queryKey: ['plan'] });
            onSuccess?.();
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
                    swimsPerWeek,
                    strengthPerWeek,
                    weeklyMileageGoal: weeklyMileage * 1000,
                    maxHeartRate,
                    restingHeartRate,
                    weight,
                    hrZone1Max: zone1Max,
                    hrZone2Max: zone2Max,
                    hrZone3Max: zone3Max,
                    hrZone4Max: zone4Max,
                    hrZone5Max: zone5Max,
                    hrZone6Max: zone6Max,
                    thresholdHeartRate: parseInt(thresholdHR) || undefined,
                    thresholdPace: thresholdPaceMin || thresholdPaceSec
                        ? (parseInt(thresholdPaceMin) || 0) * 60 + (parseInt(thresholdPaceSec) || 0)
                        : undefined,
                    taperWeeks,
                    peakWeeks,
                    buildWeeks,
                    calibrationFactor,
                    longRunDay,
                    qualityDay,
                    restDays,
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
                onSuccess?.();
            }, 2000);
        },
        onError: () => {
            setMessage('Error updating settings. Please try again.');
        }
    });

    const handleSubmit = () => {
        const errors: Record<string, string> = {};
        if (mode === 'onboarding') {
            if (!goalName.trim()) errors.goalName = "Goal name is required";
            if (!raceDate) errors.raceDate = "Race date is required";
            if (!planStartDate) errors.planStartDate = "Plan start date is required";
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            setMessage('Please fix the errors in the form.');
            return;
        }

        setFormErrors({});
        setMessage('');

        if (mode === 'onboarding') {
            createGoalMutation.mutate();
        } else {
            updateSettingsMutation.mutate();
        }
    };

    const isLoading = createGoalMutation.isPending || updateSettingsMutation.isPending;

    const inputClass = "bg-surface border border-glass-border rounded-lg p-3 text-foreground w-full outline-none focus:ring-2 focus:ring-accent-orange transition-all";

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
            <TargetRaceSection
                mode={mode}
                goalName={goalName}
                setGoalName={setGoalName}
                raceType={raceType}
                setRaceType={setRaceType}
                raceDate={raceDate}
                setRaceDate={setRaceDate}
                planStartDate={planStartDate}
                setPlanStartDate={setPlanStartDate}
                formErrors={formErrors}
            />

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
                calibrationFactor={calibrationFactor}
                setCalibrationFactor={setCalibrationFactor}
                effectiveVO2max={effectiveVO2max}
                raceActivities={raceActivities}
            />

            <GoalTimeRenderer
                mode={mode}
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
            />

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
                restDays={restDays}
                setRestDays={setRestDays}
            />

            <HeartRateZonesSection
                showHeartRate={showHeartRate}
                setShowHeartRate={setShowHeartRate}
                maxHeartRate={maxHeartRate}
                setMaxHeartRate={setMaxHeartRate}
                restingHeartRate={restingHeartRate}
                setRestingHeartRate={setRestingHeartRate}
                weight={weight}
                setWeight={setWeight}
                thresholdHR={thresholdHR}
                setThresholdHR={setThresholdHR}
                thresholdPaceMin={thresholdPaceMin}
                setThresholdPaceMin={setThresholdPaceMin}
                thresholdPaceSec={thresholdPaceSec}
                setThresholdPaceSec={setThresholdPaceSec}
                calculatedZones={calculatedZones}
                zone1Max={zone1Max}
                setZone1Max={setZone1Max}
                zone2Max={zone2Max}
                setZone2Max={setZone2Max}
                zone3Max={zone3Max}
                setZone3Max={setZone3Max}
                zone4Max={zone4Max}
                setZone4Max={setZone4Max}
                zone5Max={zone5Max}
                setZone5Max={setZone5Max}
                zone6Max={zone6Max}
                setZone6Max={setZone6Max}
            />

            {/* Message */}
            {
                message && (
                    <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.includes('Error') || message.includes('Failed')
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-green-500/10 text-green-400'
                        }`}>
                        <AlertCircle className="w-4 h-4" />
                        {message}
                    </div>
                )
            }

            {/* Submit Button */}
            {
                mode === 'onboarding' && (
                    <button
                        onClick={() => {
                            if (typeof window !== 'undefined') {
                                localStorage.setItem('runflow_onboarding_dismissed', 'true');
                            }
                            onSuccess?.();
                        }}
                        className="btn-secondary w-full flex items-center justify-center gap-2 py-3 font-medium"
                    >
                        Skip for now
                    </button>
                )
            }
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

            {
                mode === 'settings' && (
                    <p className="text-xs text-foreground-muted text-center">
                        Adjusting settings will regenerate future workouts. Completed workouts are preserved.
                    </p>
                )
            }
        </div>
    );
}
