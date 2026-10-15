'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calculator } from 'lucide-react';
import { solveCalibrationFactor } from '@/lib/metrics/runalyze';
import { Modal } from '@/components/ui/Modal';
import { formatTime, predictRaceTime, calculateVdot } from '@/lib/metrics/vdot';
import type { Activity } from '@/lib/types';

/**
 * Props for ShapeCalibrationModal
 * Exported for reuse in other components
 */
export interface ShapeCalibrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFactor: number;
    effectiveVO2max: number;
    rawVO2max?: number;
    vdotCorrectionFactor?: number;
    effectiveVo2maxCorrectionFactor?: number;
    shapePercent: number;
    activities?: Activity[];
}

type RaceType = '5K' | '10K' | 'HALF' | 'MARATHON';

/**
 * Validate and clamp time input values
 * @param value - Input string value
 * @param max - Maximum allowed value (59 for min/sec, 23 for hours)
 * @returns Clamped string value or empty string
 */
function validateTimeInput(value: string, max: number): string {
    if (value === '') return '';
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return '0';
    if (num > max) return max.toString();
    return num.toString();
}

export default function ShapeCalibrationModal({
    isOpen,
    onClose,
    currentFactor,
    effectiveVO2max,
    rawVO2max,
    vdotCorrectionFactor = 1.0,
    effectiveVo2maxCorrectionFactor = 1.0,
    shapePercent,
    activities = []
}: ShapeCalibrationModalProps) {
    const queryClient = useQueryClient();
    const [mode, setMode] = useState<'SHAPE' | 'VDOT' | 'EVO2MAX' | 'MANUAL'>('VDOT');

    // VDOT Correction State
    const [vdotRaceType, setVdotRaceType] = useState<RaceType>('5K');
    const [isCustomDistance, setIsCustomDistance] = useState(false);
    const [customDistanceMeters, setCustomDistanceMeters] = useState('');
    const [vdotHours, setVdotHours] = useState('');
    const [vdotMinutes, setVdotMinutes] = useState('');
    const [vdotSeconds, setVdotSeconds] = useState('');
    const [selectedActivityId, setSelectedActivityId] = useState<string>('');

    // Handle activity selection
    const handleActivitySelect = (activityId: string) => {
        setSelectedActivityId(activityId);
        const activity = activities.find(a => a.id === activityId);

        if (activity) {
            // Set time (prefer elapsed time if available and close to moving time, otherwise moving time)
            // For races, elapsed time is usually the official time.
            const timeSeconds = activity.elapsedTime || activity.movingTime;
            const h = Math.floor(timeSeconds / 3600);
            const m = Math.floor((timeSeconds % 3600) / 60);
            const s = timeSeconds % 60;

            setVdotHours(h.toString());
            setVdotMinutes(m.toString());
            setVdotSeconds(s.toString());

            // Determine race type based on distance
            const dist = activity.distance; // meters
            if (Math.abs(dist - 5000) < 200) {
                setVdotRaceType('5K');
                setIsCustomDistance(false);
            } else if (Math.abs(dist - 10000) < 400) {
                setVdotRaceType('10K');
                setIsCustomDistance(false);
            } else if (Math.abs(dist - 21097.5) < 500) {
                setVdotRaceType('HALF');
                setIsCustomDistance(false);
            } else if (Math.abs(dist - 42195) < 1000) {
                setVdotRaceType('MARATHON');
                setIsCustomDistance(false);
            } else {
                setIsCustomDistance(true);
                setCustomDistanceMeters(Math.round(dist).toString());
            }
        }
    };

    // Shape Calibration State (existing functionality)
    const [shapeRaceType, setShapeRaceType] = useState<'MARATHON' | 'HALF'>('MARATHON');
    const [shapeHours, setShapeHours] = useState('');
    const [shapeMinutes, setShapeMinutes] = useState('');
    const [shapeSeconds, setShapeSeconds] = useState('');

    // Manual Mode State
    const [manualFactor, setManualFactor] = useState(currentFactor.toString());

    // Effective VO2max Calibration State (two-stage: race predictions)
    const [evo2RaceType, setEvo2RaceType] = useState<'5K' | '10K' | 'HALF'>('5K');
    const [evo2Hours, setEvo2Hours] = useState('');
    const [evo2Minutes, setEvo2Minutes] = useState('');
    const [evo2Seconds, setEvo2Seconds] = useState('');
    const [selectedEvo2ActivityId, setSelectedEvo2ActivityId] = useState<string>('');
    const [manualEffectiveFactor, setManualEffectiveFactor] = useState(effectiveVo2maxCorrectionFactor.toString());

    // Handle activity selection for the Effective VO2max race calibration
    const handleEvo2ActivitySelect = (activityId: string) => {
        setSelectedEvo2ActivityId(activityId);
        const activity = activities.find(a => a.id === activityId);

        if (activity) {
            const timeSeconds = activity.elapsedTime || activity.movingTime;
            const h = Math.floor(timeSeconds / 3600);
            const m = Math.floor((timeSeconds % 3600) / 60);
            const s = timeSeconds % 60;

            setEvo2Hours(h.toString());
            setEvo2Minutes(m.toString());
            setEvo2Seconds(s.toString());

            // Map any distance in the 5K–Half band to the nearest standard race
            const dist = activity.distance; // meters
            if (dist < 7500) {
                setEvo2RaceType('5K');
            } else if (dist < 15500) {
                setEvo2RaceType('10K');
            } else {
                setEvo2RaceType('HALF');
            }
        }
    };

    // Shape Calibration Mutation (existing)
    const shapeMutation = useMutation({
        mutationFn: async (factor: number) => {
            const res = await fetch('/api/goals/calibration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shapeFactor: factor }),
            });
            if (!res.ok) throw new Error('Failed to update shape calibration');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
            queryClient.invalidateQueries({ queryKey: ['all-activities'] });
            onClose();
        },
    });

    // VDOT Correction Mutation (new)
    const vdotMutation = useMutation({
        mutationFn: async (data: {
            raceActivityId?: string;
            raceType?: RaceType;
            raceTime?: number;
            raceTimeSeconds?: number;
            raceDate?: string;
            distanceMeters?: number;
            correctionFactor?: number;
            manualFactor?: number;
            manualEffectiveVo2maxFactor?: number;
            resetToDefault?: boolean;
        }) => {
            const res = await fetch('/api/settings/vdot-correction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to update VDOT correction');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
            queryClient.invalidateQueries({ queryKey: ['all-activities'] });
            onClose();
        },
        onError: (error: Error) => {
            console.error('VDOT correction error:', error);
            alert(`Error: ${error.message}`);
        },
    });

    // VDOT Correction Calculations
    const vdotCalcData = (() => {
        const h = parseInt(vdotHours) || 0;
        const m = parseInt(vdotMinutes) || 0;
        const s = parseInt(vdotSeconds) || 0;
        const totalSeconds = h * 3600 + m * 60 + s;

        if (totalSeconds <= 0) return null;

        let impliedVdot = 0;
        let baseVdot = 0;
        if (rawVO2max && rawVO2max > 0) {
            baseVdot = rawVO2max;
        } else if (effectiveVO2max > 0) {
            // Fallback if raw not available (approximate)
            baseVdot = effectiveVO2max / vdotCorrectionFactor;
        }

        if (isCustomDistance && customDistanceMeters) {
            const meters = parseFloat(customDistanceMeters);
            if (meters > 0) {
                impliedVdot = calculateVdot({ distance: meters, timeSeconds: totalSeconds });
            }
        } else {
            impliedVdot = calculateVdot({ distance: vdotRaceType, timeSeconds: totalSeconds });
        }

        let newFactor = 0;
        if (baseVdot > 0) {
            newFactor = impliedVdot / baseVdot;
        }

        return { impliedVdot, baseVdot, newFactor };
    })();

    const vdotCorrectionValid = vdotCalcData &&
        vdotCalcData.newFactor >= 0.5 &&
        vdotCalcData.newFactor <= 1.5;

    // Effective VO2max Calibration Calculations (two-stage stage 1: impliedVdot / rawVO2max)
    const evo2CalcData = (() => {
        const h = parseInt(evo2Hours) || 0;
        const m = parseInt(evo2Minutes) || 0;
        const s = parseInt(evo2Seconds) || 0;
        const totalSeconds = h * 3600 + m * 60 + s;

        if (totalSeconds <= 0) return null;

        let impliedVdot = 0;
        let baseRawVo2max = 0;
        if (rawVO2max && rawVO2max > 0) {
            baseRawVo2max = rawVO2max;
        } else if (effectiveVO2max > 0) {
            // Fallback: estimate raw VO2max from effective VO2max and the current factor
            baseRawVo2max = effectiveVO2max / (effectiveVo2maxCorrectionFactor > 0 ? effectiveVo2maxCorrectionFactor : 1.0);
        }

        impliedVdot = calculateVdot({ distance: evo2RaceType, timeSeconds: totalSeconds });

        let newEffectiveFactor = 0;
        if (baseRawVo2max > 0) {
            newEffectiveFactor = impliedVdot / baseRawVo2max;
        }

        return { impliedVdot, baseRawVo2max, newEffectiveFactor };
    })();

    // Typical range for the effective factor — outside this we warn but still allow applying
    const evo2FactorTypical = !!evo2CalcData &&
        evo2CalcData.newEffectiveFactor >= 0.85 &&
        evo2CalcData.newEffectiveFactor <= 1.15;
    // The API clamps to [0.75, 1.25] — anything outside cannot be applied from a race
    const evo2FactorValid = !!evo2CalcData &&
        evo2CalcData.newEffectiveFactor >= 0.75 &&
        evo2CalcData.newEffectiveFactor <= 1.25;

    const evo2ManualValue = parseFloat(manualEffectiveFactor);
    const evo2ManualValid = !isNaN(evo2ManualValue) && evo2ManualValue >= 0.75 && evo2ManualValue <= 1.25;
    const evo2ApplyValid = evo2CalcData ? evo2FactorValid : evo2ManualValid;

    // Shape Calibration Calculations (existing)
    const shapeCalcData = (() => {
        const h = parseInt(shapeHours) || 0;
        const m = parseInt(shapeMinutes) || 0;
        const s = parseInt(shapeSeconds) || 0;
        const totalSeconds = h * 3600 + m * 60 + s;

        if (totalSeconds <= 0 || effectiveVO2max <= 0) return null;

        const optimalSeconds = predictRaceTime(effectiveVO2max, shapeRaceType);
        const shapeImpact = shapeRaceType === 'MARATHON' ? 0.30 : 0.15;
        const baseShapePenalty = (1 - Math.min(shapePercent, 100) / 100) * shapeImpact;
        const basePredictedSeconds = optimalSeconds * (1 + baseShapePenalty);

        const factor = solveCalibrationFactor(effectiveVO2max, shapePercent, totalSeconds, shapeRaceType);

        return {
            factor,
            actualSeconds: totalSeconds,
            optimalSeconds,
            basePredictedSeconds,
        };
    })();

    const shapeFactor = shapeCalcData?.factor || null;
    const isShapeInputValid = shapeFactor !== null && shapeFactor >= -2.0 && shapeFactor <= 2.0;

    const handleVdotSubmit = () => {
        const h = parseInt(vdotHours) || 0;
        const m = parseInt(vdotMinutes) || 0;
        const s = parseInt(vdotSeconds) || 0;
        const totalSeconds = h * 3600 + m * 60 + s;

        if (totalSeconds <= 0) return;

        if (isCustomDistance) {
            const meters = parseFloat(customDistanceMeters);
            if (meters > 0) {
                vdotMutation.mutate({
                    distanceMeters: meters,
                    raceTimeSeconds: totalSeconds
                });
            }
        } else {
            vdotMutation.mutate({
                raceType: vdotRaceType,
                raceTimeSeconds: totalSeconds
            });
        }
    };

    const handleEvo2RaceSubmit = () => {
        const h = parseInt(evo2Hours) || 0;
        const m = parseInt(evo2Minutes) || 0;
        const s = parseInt(evo2Seconds) || 0;
        const totalSeconds = h * 3600 + m * 60 + s;

        if (totalSeconds <= 0) return;

        const selectedActivity = activities.find(a => a.id === selectedEvo2ActivityId);
        vdotMutation.mutate({
            ...(selectedActivity ? {
                raceActivityId: selectedActivity.id,
                // API contract is raceDate?: string — serialize DB/Prisma Date objects
                raceDate: selectedActivity.startDate instanceof Date
                    ? selectedActivity.startDate.toISOString()
                    : selectedActivity.startDate
            } : {}),
            raceType: evo2RaceType,
            raceTime: totalSeconds,
            raceTimeSeconds: totalSeconds,
        });
    };

    const handleEvo2ManualSubmit = (factor: number) => {
        vdotMutation.mutate({ manualEffectiveVo2maxFactor: factor });
    };

    const handleApply = () => {
        if (mode === 'VDOT' && vdotCalcData && vdotCorrectionValid) {
            handleVdotSubmit();
        } else if (mode === 'EVO2MAX' && evo2ApplyValid) {
            if (evo2CalcData) {
                handleEvo2RaceSubmit();
            } else if (!isNaN(evo2ManualValue)) {
                handleEvo2ManualSubmit(evo2ManualValue);
            }
        } else if (mode === 'SHAPE' && shapeFactor && isShapeInputValid) {
            shapeMutation.mutate(shapeFactor);
        } else if (mode === 'MANUAL') {
            const factor = parseFloat(manualFactor);
            if (factor) shapeMutation.mutate(factor);
        }
    };

    if (!isOpen) return null;

    const isPending = shapeMutation.isPending || vdotMutation.isPending;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Calibration"
            icon={<Calculator className="w-5 h-5 text-accent-blue" />}
            maxWidth="md"
        >
            {/* Tabs */}
            <div className="flex border-b border-line -mx-6 mb-6 px-6">
                <button
                    onClick={() => setMode('VDOT')}
                    className={`flex-1 py-3 text-sm font-medium transition ${mode === 'VDOT' ? 'text-accent-blue border-b-2 border-accent-blue' : 'text-foreground-muted hover:text-foreground'}`}
                >
                    Training Pace
                </button>
                <button
                    onClick={() => setMode('EVO2MAX')}
                    className={`flex-1 py-3 text-sm font-medium transition ${mode === 'EVO2MAX' ? 'text-accent-cyan border-b-2 border-accent-cyan' : 'text-foreground-muted hover:text-foreground'}`}
                >
                    Effective VO2max
                </button>
                <button
                    onClick={() => setMode('SHAPE')}
                    className={`flex-1 py-3 text-sm font-medium transition ${mode === 'SHAPE' ? 'text-accent-orange border-b-2 border-accent-orange' : 'text-foreground-muted hover:text-foreground'}`}
                >
                    Shape Factor
                </button>
                <button
                    onClick={() => setMode('MANUAL')}
                    className={`flex-1 py-3 text-sm font-medium transition ${mode === 'MANUAL' ? 'text-foreground border-b-2 border-foreground' : 'text-foreground-muted hover:text-foreground'}`}
                >
                    Manual
                </button>
            </div>

            {/* Content */}
            <div className="space-y-6">
                {mode === 'VDOT' && (
                    <div className="space-y-4">
                        <div className="bg-accent-blue/10 p-3 rounded-md border border-accent-blue/20">
                            <p className="text-sm text-accent-blue">
                                Calibrate your global Effective VO2max to match your actual race performance.
                                This updates all your historical data.
                            </p>
                        </div>

                        {/* Activity Selector */}
                        <div className="space-y-2">
                            <label className="text-sm text-foreground-muted">Auto-fill from Recent Activity</label>
                            <select
                                className="w-full bg-background-secondary border border-line rounded-md px-3 py-2 text-foreground text-sm focus:border-accent-blue outline-hidden"
                                value={selectedActivityId}
                                onChange={(e) => handleActivitySelect(e.target.value)}
                            >
                                <option value="">Select an activity...</option>
                                {activities
                                    .filter(a => a.type === 'RUN' && a.distance > 1000)
                                    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                                    .slice(0, 20)
                                    .map(a => (
                                        <option key={a.id} value={a.id}>
                                            {new Date(a.startDate).toLocaleDateString()} - {(a.distance / 1000).toFixed(2)}km - {formatTime(a.elapsedTime || a.movingTime)}
                                        </option>
                                    ))
                                }
                            </select>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-xs text-foreground-muted mb-1 block">Distance</label>
                                {isCustomDistance ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            className="w-full bg-background-secondary border border-line rounded-md px-3 py-2 text-foreground focus:border-accent-blue outline-hidden font-mono"
                                            placeholder="Meters"
                                            value={customDistanceMeters}
                                            onChange={(e) => setCustomDistanceMeters(e.target.value)}
                                        />
                                        <button
                                            onClick={() => setIsCustomDistance(false)}
                                            className="text-xs text-accent-blue underline whitespace-nowrap"
                                        >
                                            Standard
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <select
                                            className="w-full bg-background-secondary border border-line rounded-md px-3 py-2 text-foreground focus:border-accent-blue outline-hidden"
                                            value={vdotRaceType}
                                            onChange={(e) => setVdotRaceType(e.target.value as RaceType)}
                                        >
                                            <option value="5K">5K</option>
                                            <option value="10K">10K</option>
                                            <option value="HALF">Half Marathon</option>
                                            <option value="MARATHON">Marathon</option>
                                        </select>
                                        <button
                                            onClick={() => { setIsCustomDistance(true); setCustomDistanceMeters(''); }}
                                            className="text-xs text-accent-blue underline whitespace-nowrap"
                                        >
                                            Custom
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2 items-center">
                            <input
                                type="number" placeholder="HH" value={vdotHours}
                                onChange={e => setVdotHours(validateTimeInput(e.target.value, 23))}
                                className="w-16 bg-background-secondary border border-line rounded-md p-2 text-foreground text-center font-mono"
                                min="0" max="23"
                            />
                            <span className="text-foreground-muted">:</span>
                            <input
                                type="number" placeholder="MM" value={vdotMinutes}
                                onChange={e => setVdotMinutes(validateTimeInput(e.target.value, 59))}
                                className="w-16 bg-background-secondary border border-line rounded-md p-2 text-foreground text-center font-mono"
                                min="0" max="59"
                            />
                            <span className="text-foreground-muted">:</span>
                            <input
                                type="number" placeholder="SS" value={vdotSeconds}
                                onChange={e => setVdotSeconds(validateTimeInput(e.target.value, 59))}
                                className="w-16 bg-background-secondary border border-line rounded-md p-2 text-foreground text-center font-mono"
                                min="0" max="59"
                            />
                        </div>

                        {/* Results */}
                        {vdotCalcData && (
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div className="p-2 bg-background-secondary rounded-md text-center">
                                        <p className="text-foreground-muted text-xs">Race VDOT</p>
                                        <p className="text-foreground font-mono text-lg tabular-nums">{vdotCalcData.impliedVdot.toFixed(1)}</p>
                                    </div>
                                    <div className="p-2 bg-background-secondary rounded-md text-center">
                                        <p className="text-foreground-muted text-xs">Current VDOT</p>
                                        <p className="text-foreground-muted font-mono text-lg tabular-nums">{vdotCalcData.baseVdot.toFixed(1)}</p>
                                    </div>
                                    <div className="p-2 bg-background-secondary rounded-md text-center">
                                        <p className="text-foreground-muted text-xs">Correction</p>
                                        <p className={`font-mono text-lg tabular-nums ${vdotCorrectionValid ? 'text-positive' : 'text-negative'}`}>
                                            {vdotCalcData.newFactor.toFixed(3)}x
                                        </p>
                                    </div>
                                </div>
                                {!vdotCorrectionValid && (
                                    <p className="text-xs text-negative">
                                        Correction factor must be between 0.5x and 1.5x. Your race result differs too much from current data.
                                    </p>
                                )}
                                <div className="text-xs text-foreground-muted text-center font-mono">
                                    Current correction: {vdotCorrectionFactor.toFixed(3)}x
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Effective VO2max Mode (two-stage stage 1: race predictions) */}
                {mode === 'EVO2MAX' && (
                    <div className="space-y-4">
                        <div className="bg-accent-cyan/10 p-3 rounded-md border border-accent-cyan/20">
                            <p className="text-sm text-accent-cyan">
                                Calibrate your Effective VO2max Correction Factor. This scales your HR-based
                                aerobic fitness (raw VO2max) for race predictions and marathon shape.
                            </p>
                        </div>

                        {/* Race auto-calibration */}
                        <div className="space-y-2">
                            <label className="text-sm text-foreground-muted">Auto-calibrate from a race (5K &ndash; Half Marathon)</label>
                            <select
                                className="w-full bg-background-secondary border border-line rounded-md px-3 py-2 text-foreground text-sm focus:border-accent-cyan outline-hidden"
                                value={selectedEvo2ActivityId}
                                onChange={(e) => handleEvo2ActivitySelect(e.target.value)}
                            >
                                <option value="">Select a race activity...</option>
                                {activities
                                    .filter(a => a.type === 'RUN' && a.distance >= 4800 && a.distance <= 21600)
                                    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                                    .slice(0, 20)
                                    .map(a => (
                                        <option key={a.id} value={a.id}>
                                            {new Date(a.startDate).toLocaleDateString()} - {(a.distance / 1000).toFixed(2)}km - {formatTime(a.elapsedTime || a.movingTime)}
                                        </option>
                                    ))
                                }
                            </select>
                        </div>

                        <div className="flex gap-2">
                            {(['5K', '10K', 'HALF'] as const).map(rt => (
                                <button
                                    key={rt}
                                    onClick={() => setEvo2RaceType(rt)}
                                    className={`px-3 py-1.5 rounded-md text-sm ${evo2RaceType === rt ? 'bg-accent-cyan text-white' : 'bg-background-secondary text-foreground-muted'}`}
                                >
                                    {rt === 'HALF' ? 'Half Marathon' : rt}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-2 items-center">
                            <input
                                type="number" placeholder="HH" value={evo2Hours}
                                onChange={e => setEvo2Hours(validateTimeInput(e.target.value, 23))}
                                className="w-16 bg-background-secondary border border-line rounded-md p-2 text-foreground text-center font-mono"
                                min="0" max="23"
                            />
                            <span className="text-foreground-muted">:</span>
                            <input
                                type="number" placeholder="MM" value={evo2Minutes}
                                onChange={e => setEvo2Minutes(validateTimeInput(e.target.value, 59))}
                                className="w-16 bg-background-secondary border border-line rounded-md p-2 text-foreground text-center font-mono"
                                min="0" max="59"
                            />
                            <span className="text-foreground-muted">:</span>
                            <input
                                type="number" placeholder="SS" value={evo2Seconds}
                                onChange={e => setEvo2Seconds(validateTimeInput(e.target.value, 59))}
                                className="w-16 bg-background-secondary border border-line rounded-md p-2 text-foreground text-center font-mono"
                                min="0" max="59"
                            />
                        </div>

                        {/* Race-derived factor preview */}
                        {evo2CalcData && (
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div className="p-2 bg-background-secondary rounded-md text-center">
                                        <p className="text-foreground-muted text-xs">Race VDOT</p>
                                        <p className="text-foreground font-mono text-lg tabular-nums">{evo2CalcData.impliedVdot.toFixed(1)}</p>
                                    </div>
                                    <div className="p-2 bg-background-secondary rounded-md text-center">
                                        <p className="text-foreground-muted text-xs">Raw VO2max</p>
                                        <p className="text-foreground-muted font-mono text-lg tabular-nums">{evo2CalcData.baseRawVo2max.toFixed(1)}</p>
                                    </div>
                                    <div className="p-2 bg-background-secondary rounded-md text-center">
                                        <p className="text-foreground-muted text-xs">Factor</p>
                                        <p className={`font-mono text-lg tabular-nums ${evo2FactorTypical ? 'text-positive' : 'text-negative'}`}>
                                            {evo2CalcData.newEffectiveFactor.toFixed(3)}x
                                        </p>
                                    </div>
                                </div>
                                {!evo2FactorTypical && (
                                    <div className="p-3 rounded-md bg-negative/10 border border-negative/20">
                                        <p className="text-xs text-negative leading-relaxed">
                                            <strong>Warning:</strong> The race-derived factor ({evo2CalcData.newEffectiveFactor.toFixed(2)}x)
                                            is outside the typical 0.85x&ndash;1.15x range. This usually indicates an inaccurate
                                            Max HR, a sub-maximal effort, or heat/hills on the day.
                                        </p>
                                    </div>
                                )}
                                {!evo2FactorValid && (
                                    <p className="text-xs text-negative">
                                        Factor must be between 0.75x and 1.25x. Your race result differs too much from current data.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Manual adjustment */}
                        <div className="pt-3 border-t border-line space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-foreground-muted">Manual factor</label>
                                <span className="text-xs text-foreground-muted font-mono">
                                    Current: {effectiveVo2maxCorrectionFactor.toFixed(2)}x
                                </span>
                            </div>
                            <div className="flex gap-4 items-center">
                                <input
                                    type="range" min="0.85" max="1.15" step="0.01"
                                    value={manualEffectiveFactor}
                                    onChange={e => setManualEffectiveFactor(e.target.value)}
                                    className="flex-1 accent-accent-cyan"
                                />
                                <input
                                    type="number" step="0.01" min="0.85" max="1.15"
                                    value={manualEffectiveFactor}
                                    onChange={e => setManualEffectiveFactor(e.target.value)}
                                    className="w-20 bg-background-secondary border border-line rounded-md p-2 text-foreground text-center font-mono"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setManualEffectiveFactor('1');
                                        handleEvo2ManualSubmit(1.0);
                                    }}
                                    disabled={isPending}
                                    className="text-xs text-foreground-muted hover:text-foreground underline disabled:opacity-50"
                                >
                                    Reset to 1.00x
                                </button>
                                {!isNaN(evo2ManualValue) && (evo2ManualValue < 0.85 || evo2ManualValue > 1.15) && (
                                    <p className="text-xs text-negative">Outside typical 0.85x&ndash;1.15x range</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Shape Factor Mode */}
                {mode === 'SHAPE' && (
                    <div className="space-y-4">
                        <p className="text-sm text-foreground-muted">
                            Enter a long-distance race to calibrate the shape penalty (how much training affects predictions).
                        </p>

                        {/* Race Type */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShapeRaceType('MARATHON')}
                                className={`px-3 py-1.5 rounded-md text-sm ${shapeRaceType === 'MARATHON' ? 'bg-accent-blue text-white' : 'bg-background-secondary text-foreground-muted'}`}
                            >
                                Marathon
                            </button>
                            <button
                                onClick={() => setShapeRaceType('HALF')}
                                className={`px-3 py-1.5 rounded-md text-sm ${shapeRaceType === 'HALF' ? 'bg-accent-blue text-white' : 'bg-background-secondary text-foreground-muted'}`}
                            >
                                Half Marathon
                            </button>
                        </div>

                        {/* Time Input */}
                        <div className="flex gap-2 items-center">
                            <input
                                type="number" placeholder="HH" value={shapeHours} onChange={e => setShapeHours(e.target.value)}
                                className="w-16 bg-background-secondary border border-line rounded-md p-2 text-foreground text-center font-mono"
                            />
                            <span className="text-foreground-muted">:</span>
                            <input
                                type="number" placeholder="MM" value={shapeMinutes} onChange={e => setShapeMinutes(e.target.value)}
                                className="w-16 bg-background-secondary border border-line rounded-md p-2 text-foreground text-center font-mono"
                            />
                            <span className="text-foreground-muted">:</span>
                            <input
                                type="number" placeholder="SS" value={shapeSeconds} onChange={e => setShapeSeconds(e.target.value)}
                                className="w-16 bg-background-secondary border border-line rounded-md p-2 text-foreground text-center font-mono"
                            />
                        </div>

                        {/* Comparison + Result */}
                        {shapeCalcData && (
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="p-2 bg-background-secondary rounded-md text-center">
                                        <p className="text-foreground-muted text-xs">Expected</p>
                                        <p className="text-foreground-muted font-mono tabular-nums">{formatTime(Math.round(shapeCalcData.basePredictedSeconds))}</p>
                                    </div>
                                    <div className="p-2 bg-background-secondary rounded-md text-center">
                                        <p className="text-foreground-muted text-xs">Your Time</p>
                                        <p className="text-foreground font-mono tabular-nums">{formatTime(shapeCalcData.actualSeconds)}</p>
                                    </div>
                                </div>
                                <div className={`p-3 rounded-md flex justify-between items-center ${isShapeInputValid ? 'bg-positive/10 border border-positive/20' : 'bg-negative/10 border border-negative/20'}`}>
                                    <span className="text-sm text-foreground-muted">Shape Factor:</span>
                                    <span className={`font-mono text-lg font-semibold tabular-nums ${isShapeInputValid ? 'text-positive' : 'text-negative'}`}>
                                        {shapeFactor?.toFixed(2)}x
                                    </span>
                                </div>
                                {!isShapeInputValid && shapeFactor !== null && (
                                    <p className="text-xs text-negative">
                                        Factor must be between -2.0x and 2.0x.
                                    </p>
                                )}
                                <div className="text-[10px] text-foreground-muted font-mono text-center">
                                    VO2:{effectiveVO2max.toFixed(1)} Shape:{shapePercent}% Opt:{Math.round(shapeCalcData.optimalSeconds)}s
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Manual Mode */}
                {mode === 'MANUAL' && (
                    <div className="space-y-4">
                        <p className="text-sm text-foreground-muted">
                            Manually adjust the shape correction factor.
                            <br /> &gt; 1.0 = Slower than predicted (more conservative)
                            <br /> &lt; 1.0 = Faster than predicted (aggressive)
                        </p>

                        <div className="flex gap-4 items-center">
                            <input
                                type="range" min="0.8" max="1.5" step="0.01"
                                value={manualFactor}
                                onChange={e => setManualFactor(e.target.value)}
                                className="flex-1 accent-accent-orange"
                            />
                            <input
                                type="number" step="0.01"
                                value={manualFactor}
                                onChange={e => setManualFactor(e.target.value)}
                                className="w-20 bg-background-secondary border border-line rounded-md p-2 text-foreground text-center font-mono"
                            />
                        </div>
                    </div>
                )}

                {/* Footer / Status */}
                <div className="pt-4 mt-6 border-t border-line flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={
                            isPending ||
                            (mode === 'VDOT' && !vdotCorrectionValid) ||
                            (mode === 'EVO2MAX' && !evo2ApplyValid) ||
                            (mode === 'SHAPE' && !isShapeInputValid)
                        }
                        className="btn-primary px-4 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPending ? 'Saving...' : 'Apply Calibration'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
