'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle, Save, Check, Trash2, Loader2, Target
} from 'lucide-react';
import { calculateAllRacePredictions } from '@/lib/metrics/runalyze';
import { calculateVdot, calculateTrainingPaces, predictRaceTime, type RaceDistance, DISTANCES } from '@/lib/metrics/vdot';
import {
    calculateProjectedGoalTime,
    calculateProgressionCoefficient,
    type PlanSettings
} from '@/lib/metrics/goalProjection';
import TargetRaceSection from './setup/TargetRaceSection';
import CalibrationSection from './setup/CalibrationSection';
import GoalTimeRenderer from './setup/GoalTimeRenderer';
import TriathlonGoalTimeRenderer from './setup/TriathlonGoalTimeRenderer';
import PlanVolumeSection from './setup/PlanVolumeSection';
import HeartRateZonesSection from './setup/HeartRateZonesSection';
import { estimateBackyardUltraTime } from '@/lib/plans/backyard-time';
import { getRaceDefaults, adjustDefaultsForVdot, getScaledPhaseDefaults } from '@/lib/plans/defaults';


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

const MAX_LONG_RUN_KM_BY_RACE: Record<string, number> = {
    FIVE_K: 18,
    TEN_K: 22,
    HALF_MARATHON: 24,
    MARATHON: 32,
    FIFTY_K: 35,
    FIFTY_MILE: 40,
    HUNDRED_K: 45,
    HUNDRED_MILE: 50,
    TWELVE_HOUR: 40,
    TWENTY_FOUR_HOUR: 50,
    BACKYARD_ULTRA: 35,
    CUSTOM_DISTANCE: 25,
    SPRINT_TRI: 15,
    OLYMPIC_TRI: 18,
    HALF_IRONMAN: 22,
    FULL_IRONMAN: 30,
    CUSTOM_TRI: 22,
};

const TRIATHLON_RACE_TYPES = new Set([
    'SPRINT_TRI', 'OLYMPIC_TRI', 'HALF_IRONMAN', 'FULL_IRONMAN', 'CUSTOM_TRI',
]);

const ULTRA_DISTANCE_MAP: Record<string, number> = {
    FIFTY_K: 50000,
    FIFTY_MILE: 80467,
    HUNDRED_K: 100000,
    HUNDRED_MILE: 160934,
};

function getDefaultMaxLongRunKm(raceType: string, weeklyMileageKm: number): number {
    const defaults = getRaceDefaults(raceType);
    const calculated = Math.round(weeklyMileageKm * 0.55);
    return Math.max(6, Math.min(calculated, defaults.maxLongRunKm));
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
    const [raceType, setRaceType] = useState('FIVE_K');
    const [raceDate, setRaceDate] = useState(
        new Date(Date.now() + 8 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [planStartDate, setPlanStartDate] = useState(
        new Date().toISOString().split('T')[0]
    );

    // Calibration Mode
    const [calibrationMode, setCalibrationMode] = useState<'activity' | 'manual'>('manual');
    const [selectedActivityId, setSelectedActivityId] = useState<string>('');

    // Manual Entry
    const [calibrationDistance, setCalibrationDistance] = useState('FIVE_K');
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');
    const [seconds, setSeconds] = useState('');

    // Plan Volume
    const fiveKDefaults = getRaceDefaults('FIVE_K');
    const [runsPerWeek, setRunsPerWeek] = useState(fiveKDefaults.runsPerWeek);
    const [ridesPerWeek, setRidesPerWeek] = useState(fiveKDefaults.ridesPerWeek);
    const [swimsPerWeek, setSwimsPerWeek] = useState(fiveKDefaults.swimsPerWeek);
    const [strengthPerWeek, setStrengthPerWeek] = useState(fiveKDefaults.strengthPerWeek);
    const [weeklyMileage, setWeeklyMileage] = useState(fiveKDefaults.weeklyVolumeKm);
    const [maxLongRunKm, setMaxLongRunKm] = useState(() => getDefaultMaxLongRunKm('FIVE_K', fiveKDefaults.weeklyVolumeKm));

    // Phase Settings
    const [taperWeeks, setTaperWeeks] = useState(fiveKDefaults.taperWeeks);
    const [peakWeeks, setPeakWeeks] = useState(fiveKDefaults.peakWeeks);
    const [buildWeeks, setBuildWeeks] = useState(fiveKDefaults.buildWeeks);

    // Workout Day Scheduling (hidden/advanced section)
    const [showSchedulingSettings, setShowSchedulingSettings] = useState(false);
    const [longRunDay, setLongRunDay] = useState(0); // 0 = Sunday
    const [qualityDay, setQualityDay] = useState(3); // 3 = Wednesday
    const [swimDay, setSwimDay] = useState(2); // 2 = Tuesday
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
    const lastAutoThresholdHR = useRef<number | null>(null);
    const lastAutoThresholdPace = useRef<number | null>(null);

    // Calculated 7 zones from LTHR
    const [calculatedZones, setCalculatedZones] = useState<{ label: string; min: number; max: number }[]>([]);

    // Goal Time State (editable)
    const [goalTimeSeconds, setGoalTimeSeconds] = useState<number | null>(null);
    const [isEditingGoalTime, setIsEditingGoalTime] = useState(false);
    const [goalTimeHours, setGoalTimeHours] = useState('');
    const [goalTimeMinutes, setGoalTimeMinutes] = useState('');
    const [goalTimeSecs, setGoalTimeSecs] = useState('');

    // Backyard Ultra
    const [backyardLoopDistM, setBackyardLoopDistM] = useState<number>(0);
    const [targetLaps, setTargetLaps] = useState(2);

    // Triathlon Goal Time
    const [triGoalTimeSeconds, setTriGoalTimeSeconds] = useState<number | null>(null);
    const [customSwimDistM, setCustomSwimDistM] = useState<number>(0);
    const [customBikeDistM, setCustomBikeDistM] = useState<number>(0);
    const [customRunDistM, setCustomRunDistM] = useState<number>(0);

    // Calibration Result
    const [calibrationFactor, setCalibrationFactor] = useState<number>(1.0);
    const lastAutoTime = useRef<number>(0);
    const hasExistingCalibration = useRef(false);

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
            // Restore existing calibration data
            if (settingsData.vdotCorrectionFactor && settingsData.vdotCorrectionFactor !== 1.0) {
                setCalibrationFactor(settingsData.vdotCorrectionFactor);
                hasExistingCalibration.current = true;
            }
            if (settingsData.vdotReferenceRaceTime && settingsData.vdotReferenceRaceType) {
                const raceTime = settingsData.vdotReferenceRaceTime;
                const h = Math.floor(raceTime / 3600);
                const m = Math.floor((raceTime % 3600) / 60);
                const s = raceTime % 60;
                setHours(h > 0 ? h.toString() : '');
                setMinutes(m.toString().padStart(2, '0'));
                setSeconds(s.toString().padStart(2, '0'));
                lastAutoTime.current = raceTime;

                const distMap: Record<string, string> = {
                    '5K': '5K',
                    '10K': '10K',
                    'HALF': 'HALF',
                    'MARATHON': 'MARATHON',
                };
                const dist = distMap[settingsData.vdotReferenceRaceType] || 'MARATHON';
                setCalibrationDistance(dist);
                setCalibrationMode('manual');
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

    const msPerWeek: number = 1000 * 60 * 60 * 24 * 7;
    const computedPlanWeeks: number = Math.max(4, Math.floor((new Date(raceDate).getTime() - new Date(planStartDate).getTime()) / msPerWeek));

    useEffect(() => {
        setMaxLongRunKm(getDefaultMaxLongRunKm(raceType, weeklyMileage));
    }, [raceType, weeklyMileage]);

    useEffect(() => {
        let defaults = getRaceDefaults(raceType);
        if (effectiveVO2max > 0) {
            defaults = adjustDefaultsForVdot(defaults, effectiveVO2max);
        }
        const scaled = getScaledPhaseDefaults(raceType, computedPlanWeeks);
        setRunsPerWeek(defaults.runsPerWeek);
        setRidesPerWeek(defaults.ridesPerWeek);
        setSwimsPerWeek(defaults.swimsPerWeek);
        setStrengthPerWeek(defaults.strengthPerWeek);
        setWeeklyMileage(defaults.weeklyVolumeKm);
        setTaperWeeks(scaled.taperWeeks);
        setPeakWeeks(scaled.peakWeeks);
        setBuildWeeks(scaled.buildWeeks);
        if (defaults.backyardLoopDistM) {
            setBackyardLoopDistM(defaults.backyardLoopDistM);
        }
        if (defaults.targetLaps) {
            setTargetLaps(defaults.targetLaps);
        }
        setTriGoalTimeSeconds(null);
    }, [raceType, mode, computedPlanWeeks]);

    // Auto-prefill threshold values from calibration data while still allowing manual overrides.
    useEffect(() => {
        const calibrationSeconds =
            (parseInt(hours) || 0) * 3600 +
            (parseInt(minutes) || 0) * 60 +
            (parseInt(seconds) || 0);

        if (calibrationSeconds <= 0) return;

        const vdot = calculateVdot({
            distance: calibrationDistance as RaceDistance,
            timeSeconds: calibrationSeconds,
        });

        if (vdot <= 0) return;

        const suggestedThresholdPace = calculateTrainingPaces(vdot).threshold;
        const currentThresholdPace =
            (parseInt(thresholdPaceMin) || 0) * 60 +
            (parseInt(thresholdPaceSec) || 0);
        const thresholdPaceIsEmpty = !thresholdPaceMin && !thresholdPaceSec;
        const thresholdPaceMatchesLastAuto =
            lastAutoThresholdPace.current !== null &&
            currentThresholdPace === lastAutoThresholdPace.current;

        if (thresholdPaceIsEmpty || thresholdPaceMatchesLastAuto) {
            setThresholdPaceMin(Math.floor(suggestedThresholdPace / 60).toString());
            setThresholdPaceSec((suggestedThresholdPace % 60).toString().padStart(2, '0'));
            lastAutoThresholdPace.current = suggestedThresholdPace;
        }

        const suggestedThresholdHR = Math.round(maxHeartRate * 0.9);
        const currentThresholdHR = parseInt(thresholdHR);
        const thresholdHRIsEmpty = !thresholdHR;
        const thresholdHRMatchesLastAuto =
            !isNaN(currentThresholdHR) &&
            lastAutoThresholdHR.current !== null &&
            currentThresholdHR === lastAutoThresholdHR.current;

        if (thresholdHRIsEmpty || thresholdHRMatchesLastAuto) {
            setThresholdHR(suggestedThresholdHR.toString());
            lastAutoThresholdHR.current = suggestedThresholdHR;
        }
    }, [
        calibrationDistance,
        hours,
        minutes,
        seconds,
        maxHeartRate,
        thresholdHR,
        thresholdPaceMin,
        thresholdPaceSec,
    ]);

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
                if (activeGoal.planStartDate) {
                    setPlanStartDate(new Date(activeGoal.planStartDate).toISOString().split('T')[0]);
                } else if (activeGoal.workouts?.length > 0) {
                    const sortedWorkouts = [...activeGoal.workouts].sort((a: any, b: any) =>
                        new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
                    );
                    const firstPlannedDate = new Date(sortedWorkouts[0].scheduledDate).toISOString().split('T')[0];
                    setPlanStartDate(firstPlannedDate);
                }
            }
        }
    }, [goalsData]);

    // Update predicted time when distance or fitness changes (Manual Mode - Onboarding only)
    useEffect(() => {
        if (mode === 'settings' && hasExistingCalibration.current) return;

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
    }, [mode, calibrationDistance, effectiveVO2max, shapePercent, calibrationMode, selectedActivityId, hours, minutes, seconds]);

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
                        distance: calibrationDistance as RaceDistance,
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
                    displaySeconds = predictRaceTime(vdot, calibrationDistance as RaceDistance);
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

            const isTriathlon = TRIATHLON_RACE_TYPES.has(raceType);
            const sport = isTriathlon ? 'TRIATHLON' : 'RUN';

            let computedTargetTime: number | null = goalTimeSeconds;
            if (isTriathlon) {
                computedTargetTime = triGoalTimeSeconds;
            }

            if (!computedTargetTime && effectiveVO2max > 0) {
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

            const body: Record<string, unknown> = {
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
                weeklyMileageGoal: weeklyMileage * 1000,
                maxLongRunKm,
                longRunDay,
                workoutDay: qualityDay,
                swimDay,
                restDays,
                sport,
                ...(computedTargetTime && { targetTime: Math.round(computedTargetTime) }),
                ...(timeSeconds > 0 && {
                    calibrationTime: Math.round(timeSeconds),
                    calibrationDistance,
                    calibrationActivityId: calibrationMode === 'activity' ? selectedActivityId : undefined,
                    calibrationFactor,
                }),
                ...(raceType === 'BACKYARD_ULTRA' && backyardLoopDistM > 0 && {
                    backyardLoopDistM,
                    targetLaps,
                }),
                ...(raceType === 'CUSTOM_TRI' && customSwimDistM > 0 && { customSwimDistM }),
                ...(raceType === 'CUSTOM_TRI' && customBikeDistM > 0 && { customBikeDistM }),
                ...(raceType === 'CUSTOM_TRI' && customRunDistM > 0 && { customRunDistM }),
            };

            const res = await fetch('/api/plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
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
                    maxLongRunKm,
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

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const deletePlanMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/goals', { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to delete plan');
            }
            return res.json();
        },
        onSuccess: (data) => {
            setMessage(`Plan deleted (${data.deletedWorkouts} workouts removed).`);
            setShowDeleteConfirm(false);
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            queryClient.invalidateQueries({ queryKey: ['plan'] });
            setTimeout(() => {
                setMessage('');
                onSuccess?.();
            }, 2000);
        },
        onError: (err) => {
            setMessage(`Failed to delete: ${err.message}`);
            setShowDeleteConfirm(false);
        },
    });

    const raceActivities: RaceActivity[] = activitiesData?.activities?.filter((a: RaceActivity) =>
        a.distance >= 4500
    ) || [];

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
                setCalibrationFactor={setCalibrationFactor}
                effectiveVO2max={effectiveVO2max}
                raceActivities={raceActivities}
            />

            {TRIATHLON_RACE_TYPES.has(raceType) && (
                <TriathlonGoalTimeRenderer
                    vdot={effectiveVO2max * calibrationFactor}
                    raceType={raceType}
                    customSwimDistM={customSwimDistM > 0 ? customSwimDistM : undefined}
                    customBikeDistM={customBikeDistM > 0 ? customBikeDistM : undefined}
                    customRunDistM={customRunDistM > 0 ? customRunDistM : undefined}
                    goalTimeSeconds={triGoalTimeSeconds}
                    onGoalTimeChange={setTriGoalTimeSeconds}
                    planWeeks={computedPlanWeeks}
                    runsPerWeek={runsPerWeek}
                    weeklyMileageGoal={weeklyMileage}
                />
            )}

            {raceType === 'CUSTOM_TRI' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-accent-orange mb-2">
                        <Target className="w-5 h-5" />
                        <h3 className="text-sm font-semibold uppercase tracking-wide">Custom Triathlon Distances</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs text-foreground-muted mb-1 uppercase">Swim (m)</label>
                            <input
                                type="number"
                                value={customSwimDistM || ''}
                                onChange={(e) => setCustomSwimDistM(parseFloat(e.target.value) || 0)}
                                placeholder="1500"
                                min={100}
                                className="bg-surface border border-glass-border rounded-lg p-3 text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-orange transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-foreground-muted mb-1 uppercase">Bike (m)</label>
                            <input
                                type="number"
                                value={customBikeDistM || ''}
                                onChange={(e) => setCustomBikeDistM(parseFloat(e.target.value) || 0)}
                                placeholder="40000"
                                min={1000}
                                className="bg-surface border border-glass-border rounded-lg p-3 text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-orange transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-foreground-muted mb-1 uppercase">Run (m)</label>
                            <input
                                type="number"
                                value={customRunDistM || ''}
                                onChange={(e) => setCustomRunDistM(parseFloat(e.target.value) || 0)}
                                placeholder="10000"
                                min={1000}
                                className="bg-surface border border-glass-border rounded-lg p-3 text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-orange transition-all"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-foreground-muted">Leave blank to use Olympic triathlon defaults (1500m / 40km / 10km)</p>
                </div>
            )}

            {!TRIATHLON_RACE_TYPES.has(raceType) && raceType !== 'BACKYARD_ULTRA' && !['TWELVE_HOUR', 'TWENTY_FOUR_HOUR'].includes(raceType) && (
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
                    distanceOverrideM={ULTRA_DISTANCE_MAP[raceType]}
                />
            )}

            {raceType === 'BACKYARD_ULTRA' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-accent-orange mb-2">
                        <Target className="w-5 h-5" />
                        <h3 className="text-sm font-semibold uppercase tracking-wide">Backyard Ultra Setup</h3>
                    </div>
                    <div>
                        <label className="block text-xs text-foreground-muted mb-1 uppercase">Loop Distance (meters)</label>
                        <input
                            type="number"
                            value={backyardLoopDistM || ''}
                            onChange={(e) => setBackyardLoopDistM(parseFloat(e.target.value) || 0)}
                            placeholder="e.g. 6706"
                            min={100}
                            className="bg-surface border border-glass-border rounded-lg p-3 text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-orange transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-foreground-muted mb-1 uppercase">Target Laps: {targetLaps}</label>
                        <input
                            type="range"
                            min={1}
                            max={100}
                            step={1}
                            value={targetLaps}
                            onChange={(e) => setTargetLaps(parseInt(e.target.value))}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                        <div className="flex justify-between text-xs text-foreground-muted mt-1">
                            <span>1</span>
                            <span>100</span>
                        </div>
                    </div>
                    {backyardLoopDistM > 0 && (
                        <div className="text-xs text-foreground-muted">
                            Total distance: <span className="text-foreground font-medium">{((backyardLoopDistM * targetLaps) / 1000).toFixed(1)} km</span>
                        </div>
                    )}
                    {backyardLoopDistM > 0 && effectiveVO2max > 0 && (() => {
                        const progressionFactor = calculateProgressionCoefficient(computedPlanWeeks, runsPerWeek, weeklyMileage);
                        const projectedVdot = effectiveVO2max * calibrationFactor * progressionFactor;
                        const projection = estimateBackyardUltraTime({ vdot: projectedVdot, loopDistM: backyardLoopDistM, targetLaps });
                        if (!projection) return null;
                        const fmt = (s: number) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
                        return (
                            <div className="text-xs bg-surface border border-glass-border rounded-lg p-3 space-y-1">
                                <div className="text-foreground-muted">Estimated finish time:</div>
                                <div className="text-green-400 font-medium">Optimal: {fmt(projection.optimal.totalSeconds)}</div>
                                <div className="text-accent-orange font-medium">Projected: {fmt(projection.projected.totalSeconds)}</div>
                                <div className="text-red-400 font-medium">Conservative: {fmt(projection.conservative.totalSeconds)}</div>
                            </div>
                        );
                    })()}
                    {backyardLoopDistM > 0 && (
                        <div className="text-[10px] text-foreground-muted">Estimated based on running fitness</div>
                    )}
                </div>
            )}

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

            {
                mode === 'settings' && !showDeleteConfirm && (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/10 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Plan
                    </button>
                )
            }

            {
                mode === 'settings' && showDeleteConfirm && (
                    <div className="border border-red-500/30 rounded-xl p-4 space-y-3 bg-red-500/5">
                        <p className="text-sm text-red-400 font-medium">Delete this plan and all future workouts?</p>
                        <p className="text-xs text-foreground-muted">Completed workouts are preserved. You can create a new plan from the onboarding flow.</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-2 text-sm rounded-lg border border-glass-border text-foreground hover:bg-surface-hover transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deletePlanMutation.mutate()}
                                disabled={deletePlanMutation.isPending}
                                className="flex-1 py-2 text-sm rounded-lg bg-red-500 text-white font-medium flex items-center justify-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                                {deletePlanMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
