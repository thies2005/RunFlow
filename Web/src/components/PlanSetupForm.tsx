'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle, Save, Check, Trash2
} from 'lucide-react';
import { calculateAllRacePredictions } from '@/lib/metrics/runalyze';
import { calculateVdot, calculateTrainingPaces, predictRaceTime, type RaceDistance, DISTANCES } from '@/lib/metrics/vdot';
import {
    calculateProjectedGoalTime,
    type PlanSettings
} from '@/lib/metrics/goalProjection';
import TargetRaceSection from './setup/TargetRaceSection';
import CalibrationSection from './setup/CalibrationSection';
import GoalTimeRenderer from './setup/GoalTimeRenderer';
import TriathlonGoalTimeRenderer from './setup/TriathlonGoalTimeRenderer';
import PlanVolumeSection from './setup/PlanVolumeSection';
import HeartRateZonesSection from './setup/HeartRateZonesSection';
import CustomTriathlonDistancesSection from './setup/CustomTriathlonDistancesSection';
import DirectPlanImportSection from './setup/DirectPlanImportSection';
import StartMileageAndSubGoalsSection from './setup/StartMileageAndSubGoalsSection';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { getRaceDefaults, adjustDefaultsForVdot, getScaledPhaseDefaults } from '@/lib/plans/defaults';
import {
    type RaceActivity,
    type SubGoalForm,
    type PlanSetupFormProps,
    MAX_LONG_RUN_KM_BY_RACE,
    TRIATHLON_RACE_TYPES,
    ULTRA_DISTANCE_MAP,
    getDefaultMaxLongRunKm,
} from './setup/types';

export default function PlanSetupForm({
    mode,
    onSuccess,
    currentVdot: propCurrentVdot = 0,
    shapePercent: propShapePercent = 0,
    planSource: propPlanSource,
    creationMode: propCreationMode,
    initialExperienceLevel,
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
    const [zone1Max, setZone1Max] = useState(130);
    const [zone2Max, setZone2Max] = useState(148);
    const [zone3Max, setZone3Max] = useState(160);
    const [zone4Max, setZone4Max] = useState(170);
    const [zone5Max, setZone5Max] = useState(178);
    const [zone6Max, setZone6Max] = useState(187);

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

    // Start Weekly Mileage
    const [startWeeklyMileage, setStartWeeklyMileage] = useState<number>(0);
    const startMileageInitialized = useRef(false);

    // Experience Level
    const [experienceLevel, setExperienceLevel] = useState<string>('INTERMEDIATE');

    // Sport / NO_RACE
    const [sport, setSport] = useState<string>('RUN');
    const [durationWeeks, setDurationWeeks] = useState<string>('12');

    // Athlete overrides
    const [athleteCssOverride, setAthleteCssOverride] = useState<number | null>(null);
    const [athleteBikeSpeedOverride, setAthleteBikeSpeedOverride] = useState<number | null>(null);

    // MyWhoosh
    const [matchToMyWhoosh, setMatchToMyWhoosh] = useState(false);
    const [mywhooshPlanId, setMywhooshPlanId] = useState<string>('');

    // Sub-Goals (advanced mode)
    const [subGoals, setSubGoals] = useState<SubGoalForm[]>([]);

    // Calibration Result
    const [calibrationFactor, setCalibrationFactor] = useState<number>(1.0);
    const lastAutoTime = useRef<number>(0);
    const hasExistingCalibration = useRef(false);
    // Track whether we've loaded settings from the server (to prevent race-type defaults from overriding them)
    const settingsLoadedRef = useRef(false);


    const [message, setMessage] = useState('');
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (initialExperienceLevel) {
            adjustDefaultsForExperience(initialExperienceLevel);
        }
    }, [initialExperienceLevel]);

    const adjustDefaultsForExperience = (level: string) => {
        setExperienceLevel(level);
        const defaults = getRaceDefaults(raceType);
        switch (level) {
            case 'BEGINNER':
                setRunsPerWeek(3);
                setWeeklyMileage(25);
                setTaperWeeks(3);
                setPeakWeeks(3);
                setBuildWeeks(4);
                break;
            case 'INTERMEDIATE':
                setRunsPerWeek(4);
                setWeeklyMileage(40);
                setTaperWeeks(2);
                setPeakWeeks(4);
                setBuildWeeks(5);
                break;
            case 'ADVANCED':
                setRunsPerWeek(5);
                setWeeklyMileage(60);
                setTaperWeeks(2);
                setPeakWeeks(5);
                setBuildWeeks(6);
                break;
        }
    };

    // Fetch race-eligible activities
    const { data: activitiesData } = useQuery({
        queryKey: ['race-activities'],
        queryFn: async () => {
            const res = await fetch('/api/activities?type=RUN&limit=50&raceEligible=true');
            if (!res.ok) throw new Error('Failed to fetch activities');
            return res.json();
        },
    });

    // Fetch analytics stats (for both modes to get VDOT if not passed)
    const { data: internalStatsData } = useQuery({
        queryKey: ['analytics-stats'],
        queryFn: async () => {
            const res = await fetch('/api/analytics/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        },
    });

    // Use props if provided, otherwise fall back to internally fetched stats.
    // Plan setup is a planning surface: it uses the performance VDOT metric,
    // never the HR-based aerobic-fitness trend.
    const currentVdot = propCurrentVdot > 0 ? propCurrentVdot : (internalStatsData?.vdot || 0);
    const shapePercent = propShapePercent > 0 ? propShapePercent : (internalStatsData?.marathonShape?.shape || 0);

    // Auto-initialize startWeeklyMileage from the user's last 4 weeks of running
    // startWeeklyMileage is not persisted in the Goal model, so we always derive it
    useEffect(() => {
        if (!startMileageInitialized.current && internalStatsData?.avgWeeklyKmLast4Weeks > 0) {
            const avg = internalStatsData.avgWeeklyKmLast4Weeks;
            // Round down to nearest 5 km for a clean slider value
            const rounded = Math.floor(avg / 5) * 5;
            setStartWeeklyMileage(Math.max(5, rounded));
            startMileageInitialized.current = true;
        }
    }, [internalStatsData]);

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
            setZone1Max(settingsData.hrZone1Max || 130);
            setZone2Max(settingsData.hrZone2Max || 148);
            setZone3Max(settingsData.hrZone3Max || 160);
            setZone4Max(settingsData.hrZone4Max || 170);
            setZone5Max(settingsData.hrZone5Max || 178);
            setZone6Max(settingsData.hrZone6Max || 187);
            setRunsPerWeek(settingsData.runsPerWeek || 4);
            setRidesPerWeek(settingsData.ridesPerWeek || 0);
            setSwimsPerWeek(settingsData.swimsPerWeek || 0);
            setStrengthPerWeek(settingsData.strengthPerWeek || 0);
            setWeeklyMileage(settingsData.weeklyMileageGoal || 40);
            if (typeof settingsData.startWeeklyMileage === 'number' && settingsData.startWeeklyMileage > 0) {
                setStartWeeklyMileage(settingsData.startWeeklyMileage);
                startMileageInitialized.current = true;
            }
            setTaperWeeks(settingsData.taperWeeks || 2);
            setPeakWeeks(settingsData.peakWeeks || 4);
            setBuildWeeks(settingsData.buildWeeks || 4);
            // Scheduling preferences
            setLongRunDay(settingsData.longRunDay ?? 0);
            setQualityDay(settingsData.qualityDay ?? 3);
            if (typeof settingsData.swimDay === 'number') {
                setSwimDay(settingsData.swimDay);
            }
            if (Array.isArray(settingsData.restDays)) {
                setRestDays(settingsData.restDays);
            }
            // Max long run distance (derived from longest scheduled long run)
            if (typeof settingsData.maxLongRunKm === 'number' && settingsData.maxLongRunKm > 0) {
                setMaxLongRunKm(settingsData.maxLongRunKm);
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
            // Restore MyWhoosh preference
            if (typeof settingsData.matchToMyWhoosh === 'boolean') {
                setMatchToMyWhoosh(settingsData.matchToMyWhoosh);
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
            settingsLoadedRef.current = true;
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
    const computedPlanWeeks: number = (sport === 'NO_RACE' || sport === 'CYCLING')
        ? (parseInt(durationWeeks) || 8)
        : Math.max(4, Math.floor((new Date(raceDate).getTime() - new Date(planStartDate).getTime()) / msPerWeek));

    // Track whether the user has explicitly changed raceType after settings loaded
    const userChangedRaceTypeRef = useRef(false);
    // Track whether the user has explicitly changed weeklyMileage or raceType after settings loaded
    const userChangedVolumeRef = useRef(false);

    const maxLongRunLoadedRef = useRef(false);
    useEffect(() => {
        // In settings mode, only recalculate maxLongRunKm when the user explicitly changed volume/race
        if (mode === 'settings') {
            if (!userChangedVolumeRef.current) {
                return; // Don't recalculate from defaults — API value is correct
            }
        }
        setMaxLongRunKm(getDefaultMaxLongRunKm(raceType, weeklyMileage));
    }, [raceType, weeklyMileage, mode]);

    useEffect(() => {
        // In settings mode, only apply race-type defaults when the user explicitly changes the race type.
        // The settingsData effect already loaded the correct saved values from the API.
        // We block ALL default overwrites until the user explicitly changes raceType.
        if (mode === 'settings') {
            if (!userChangedRaceTypeRef.current) {
                return; // Skip — settings were loaded from API, no user change yet
            }
        }
        let defaults = getRaceDefaults(raceType);
        if (currentVdot > 0) {
            defaults = adjustDefaultsForVdot(defaults, currentVdot);
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
        // Mark volume as changed too, so maxLongRunKm recalculates on next render
        userChangedVolumeRef.current = true;
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
                const isCyclingGoal = !activeGoal.raceType && activeGoal.ridesPerWeek > 0 && activeGoal.runsPerWeek === 0;
                setGoalName(activeGoal.name || 'My Race');
                setRaceType(activeGoal.raceType || 'MARATHON');
                setSport(isCyclingGoal ? 'CYCLING' : (activeGoal.sport || (TRIATHLON_RACE_TYPES.has(activeGoal.raceType) ? 'TRIATHLON' : 'RUN')));
                if (activeGoal.planWeeks) {
                    setDurationWeeks(String(activeGoal.planWeeks));
                }
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

        if (currentVdot > 0 && calibrationMode === 'manual' && !selectedActivityId) {
            const getPredictedTimeForDistance = (dist: string) => {
                const predictions = calculateAllRacePredictions(currentVdot, shapePercent);
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
    }, [mode, calibrationDistance, currentVdot, shapePercent, calibrationMode, selectedActivityId, hours, minutes, seconds]);

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
                if (currentVdot > 0) {
                    setCalibrationFactor(vdot / currentVdot);
                }
            }
        }
    }, [selectedActivityId, activitiesData, calibrationDistance, currentVdot]); // Re-run when dist changes

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

            const isCycling = sport === 'CYCLING';
            const isTriathlon = TRIATHLON_RACE_TYPES.has(raceType) || sport === 'TRIATHLON';
            const effectiveSport = isCycling ? 'CYCLING' : sport === 'NO_RACE' ? 'NO_RACE' : (isTriathlon ? 'TRIATHLON' : 'RUN');
            const isDurationBased = effectiveSport === 'NO_RACE' || effectiveSport === 'CYCLING';

            let computedTargetTime: number | null = goalTimeSeconds;
            if (isTriathlon) {
                computedTargetTime = triGoalTimeSeconds;
            } else if (isDurationBased) {
                computedTargetTime = null;
            }

            if (!computedTargetTime && !isDurationBased && currentVdot > 0) {
                const raceDistanceMap: Record<string, RaceDistance> = {
                    'FIVE_K': '5K',
                    'TEN_K': '10K',
                    'HALF_MARATHON': 'HALF',
                    'MARATHON': 'MARATHON',
                };
                const mappedDistance = raceDistanceMap[raceType] || 'MARATHON';
                const calibratedVO2max = currentVdot * calibrationFactor;
                const planSettings: PlanSettings = {
                    durationWeeks: computedPlanWeeks,
                    runsPerWeek: Math.max(1, runsPerWeek),
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
                raceType: isDurationBased ? null : raceType,
                raceDate: isDurationBased ? null : new Date(raceDate).toISOString(),
                planStartDate: new Date(planStartDate).toISOString(),
                planWeeks: isDurationBased
                    ? (parseInt(durationWeeks) || 8)
                    : Math.max(4, Math.floor((new Date(raceDate).getTime() - new Date(planStartDate).getTime()) / (1000 * 60 * 60 * 24 * 7))),
                runsPerWeek,
                ridesPerWeek: isCycling ? Math.max(1, ridesPerWeek) : ridesPerWeek,
                swimsPerWeek,
                strengthPerWeek,
                taperWeeks,
                peakWeeks,
                buildWeeks,
                weeklyMileageGoal: weeklyMileage * 1000,
                startWeeklyMileage: startWeeklyMileage > 0 ? startWeeklyMileage * 1000 : undefined,
                maxLongRunKm,
                longRunDay,
                workoutDay: qualityDay,
                swimDay,
                restDays,
                sport: effectiveSport,
                matchToMyWhoosh: false,
                mywhooshPlanId: null,
                maxHeartRate,
                restingHeartRate,
                hrZoneMethod: 'CUSTOM',
                hrZone1Max: zone1Max,
                hrZone2Max: zone2Max,
                hrZone3Max: zone3Max,
                hrZone4Max: zone4Max,
                hrZone5Max: zone5Max,
                hrZone6Max: zone6Max,
                thresholdHeartRate: parseInt(thresholdHR) || undefined,
                thresholdPaceSecondsPerKm: thresholdPaceMin || thresholdPaceSec
                    ? (parseInt(thresholdPaceMin) || 0) * 60 + (parseInt(thresholdPaceSec) || 0)
                    : undefined,
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
                ...(athleteCssOverride != null && { athleteCssOverride }),
                ...(athleteBikeSpeedOverride != null && { athleteBikeSpeedOverride }),
                ...(sport === 'NO_RACE' && { durationWeeks: parseInt(durationWeeks) || 12 }),
                ...((mode === 'advanced' || mode === 'modal') && {
                    planSource: 'advanced',
                    creationMode: 'EXPERT_MANUAL',
                }),
                ...(subGoals.length > 0 && {
                    subGoals: subGoals.filter((sg) => sg.name.trim()).map((sg) => ({
                        name: sg.name.trim(),
                        sport: sg.sport,
                        raceType: sg.raceType || null,
                        raceDate: sg.raceDate || null,
                        ...(sg.targetTime && { targetTime: sg.targetTime }),
                    })),
                }),
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
            const rawTimeSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
            const timeSeconds = rawTimeSeconds > 0 ? rawTimeSeconds : ((sport === 'CYCLING' || runsPerWeek === 0) ? 1500 : 0);

            if (timeSeconds === 0) throw new Error('Time cannot be zero');

            const isCycling = sport === 'CYCLING';

            const res = await fetch('/api/settings/update-vdot', {
                method: 'POST',
                body: JSON.stringify({
                    timeSeconds,
                    raceDistance: calibrationDistance,
                    runsPerWeek,
                    ridesPerWeek: isCycling ? Math.max(1, ridesPerWeek) : ridesPerWeek,
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
                    matchToMyWhoosh: false,
                    mywhooshPlanId: null,
                    raceType: isCycling ? null : raceType,
                    raceDate,
                    planStartDate,
                    sport: isCycling ? 'TRIATHLON' : (TRIATHLON_RACE_TYPES.has(raceType) ? 'TRIATHLON' : sport),
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

    const activeGoalId: string | undefined = goalsData?.goals?.find((g: { isActive: boolean }) => g.isActive)?.id;
    const isCreatingPlan = mode === 'onboarding' || mode === 'advanced' || mode === 'modal' || !activeGoalId;

    const handleSubmit = () => {
        const errors: Record<string, string> = {};
        if (isCreatingPlan) {
            if (!goalName.trim()) errors.goalName = "Goal name is required";
            if (sport !== 'NO_RACE' && sport !== 'CYCLING' && !raceDate) errors.raceDate = "Race date is required";
            if (!planStartDate) errors.planStartDate = "Plan start date is required";
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            setMessage('Please fix the errors in the form.');
            return;
        }

        setFormErrors({});
        setMessage('');

        if (isCreatingPlan) {
            createGoalMutation.mutate();
        } else {
            updateSettingsMutation.mutate();
        }
    };

    const isLoading = createGoalMutation.isPending || updateSettingsMutation.isPending;

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Delete plan mutation (soft-delete via the advanced plan endpoint: snapshots + cleans sub-goals)
    const deletePlanMutation = useMutation({
        mutationFn: async (goalId: string) => {
            const res = await fetch(`/api/plan-advanced/${goalId}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to delete plan');
            }
            return res.json();
        },
        onSuccess: () => {
            setMessage('Plan deleted.');
            setShowDeleteConfirm(false);
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            queryClient.invalidateQueries({ queryKey: ['plan'] });
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
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
                setRaceType={(val: string) => {
                    if (mode === 'settings' && settingsLoadedRef.current) {
                        userChangedRaceTypeRef.current = true;
                        userChangedVolumeRef.current = true;
                    }
                    setRaceType(val);
                }}
                raceDate={raceDate}
                setRaceDate={setRaceDate}
                planStartDate={planStartDate}
                setPlanStartDate={setPlanStartDate}
                formErrors={formErrors}
                sport={sport}
                setSport={(nextSport: string) => {
                    setSport(nextSport);
                    if (nextSport === 'CYCLING') {
                        setMatchToMyWhoosh(false);
                        setMywhooshPlanId('');
                        setDurationWeeks('8');
                        if (goalName === 'My First Race' || goalName === 'My Race') {
                            setGoalName('8-Week Cycling FTP Block');
                        }
                        setRunsPerWeek(0);
                        setRidesPerWeek(4);
                        setSwimsPerWeek(0);
                        setStrengthPerWeek(1);
                    } else if (nextSport === 'RUN' && runsPerWeek === 0) {
                        setRunsPerWeek(4);
                    }
                }}
                durationWeeks={durationWeeks}
                setDurationWeeks={setDurationWeeks}
                experienceLevel={experienceLevel}
                setExperienceLevel={adjustDefaultsForExperience}
                showGoalNameInSettings={!activeGoalId}
            />

            {runsPerWeek > 0 && (
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
                    currentVdot={currentVdot}
                    raceActivities={raceActivities}
                />
            )}

            {TRIATHLON_RACE_TYPES.has(raceType) && (
                <TriathlonGoalTimeRenderer
                    vdot={currentVdot * calibrationFactor}
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
                <CustomTriathlonDistancesSection
                    customSwimDistM={customSwimDistM}
                    setCustomSwimDistM={setCustomSwimDistM}
                    customBikeDistM={customBikeDistM}
                    setCustomBikeDistM={setCustomBikeDistM}
                    customRunDistM={customRunDistM}
                    setCustomRunDistM={setCustomRunDistM}
                />
            )}

            {sport !== 'CYCLING' && runsPerWeek > 0 && !TRIATHLON_RACE_TYPES.has(raceType) && raceType !== 'BACKYARD_ULTRA' && !['TWELVE_HOUR', 'TWENTY_FOUR_HOUR'].includes(raceType) && (
                <GoalTimeRenderer
                    mode={mode}
                    currentVdot={currentVdot}
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

            {/* Direct Plan Import in Plan Setup Phase (CSV / Calendar Screenshot AI / .zwo) */}
            <DirectPlanImportSection
                activeGoalId={activeGoalId}
                sport={sport}
                raceType={raceType}
                raceDate={raceDate}
                planStartDate={planStartDate}
                goalName={goalName}
                durationWeeks={durationWeeks}
                isLoading={isLoading}
                setMessage={setMessage}
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
                setWeeklyMileage={(val: number) => {
                    if (mode === 'settings' && settingsLoadedRef.current) {
                        userChangedVolumeRef.current = true;
                    }
                    setWeeklyMileage(val);
                }}
                raceType={raceType}
                maxLongRunKm={maxLongRunKm}
                setMaxLongRunKm={(val: number) => {
                    if (mode === 'settings' && settingsLoadedRef.current) {
                        userChangedVolumeRef.current = true;
                    }
                    setMaxLongRunKm(val);
                }}
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
                sport={sport}
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

            <StartMileageAndSubGoalsSection
                mode={mode}
                runsPerWeek={runsPerWeek}
                weeklyMileage={weeklyMileage}
                startWeeklyMileage={startWeeklyMileage}
                setStartWeeklyMileage={setStartWeeklyMileage}
                avgWeeklyKmLast4Weeks={internalStatsData?.avgWeeklyKmLast4Weeks}
                subGoals={subGoals}
                setSubGoals={setSubGoals}
            />

            {/* Direct Plan Import is available above across all setup modes */}

            {/* Message */}
            {
                message && (
                    <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${message.includes('Error') || message.includes('Failed')
                        ? 'bg-negative/10 text-negative'
                        : 'bg-positive/10 text-positive'
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
                        {isCreatingPlan ? 'Generating Plan...' : 'Updating...'}
                    </>
                ) : (
                    <>
                        <Check className="w-5 h-5" />
                        {isCreatingPlan ? 'Generate Training Plan' : 'Save & Regenerate Plan'}
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
                mode === 'settings' && activeGoalId && !showDeleteConfirm && (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-negative border border-negative/30 rounded-md hover:bg-negative/10 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Plan
                    </button>
                )
            }

            {mode === 'settings' && (
                <ConfirmDialog
                    open={showDeleteConfirm}
                    onOpenChange={setShowDeleteConfirm}
                    planName={goalName}
                    onConfirm={() => { if (activeGoalId) deletePlanMutation.mutate(activeGoalId); }}
                    busy={deletePlanMutation.isPending}
                />
            )}
        </div>
    );
}
