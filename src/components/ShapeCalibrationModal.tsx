'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Calculator } from 'lucide-react';
import { solveCalibrationFactor } from '@/lib/metrics/runalyze';
import { formatTime, predictRaceTime, calculateVdot, type RaceDistance } from '@/lib/metrics/vdot';
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
    shapePercent,
    activities = []
}: ShapeCalibrationModalProps) {
    const queryClient = useQueryClient();
    const [mode, setMode] = useState<'SHAPE' | 'VDOT' | 'MANUAL'>('VDOT');

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
        mutationFn: async (data: { raceType?: RaceType; raceTimeSeconds: number; distanceMeters?: number } | { correctionFactor: number }) => {
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

    const handleApply = () => {
        if (mode === 'VDOT' && vdotCalcData && vdotCorrectionValid) {
            handleVdotSubmit();
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-[#111827] border border-gray-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-accent-cyan" />
                        Calibration
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-800">
                    <button
                        onClick={() => setMode('VDOT')}
                        className={`flex-1 py-3 text-sm font-medium transition ${mode === 'VDOT' ? 'text-accent-cyan border-b-2 border-accent-cyan' : 'text-gray-400 hover:text-white'}`}
                    >
                        VDOT Correction
                    </button>
                    <button
                        onClick={() => setMode('SHAPE')}
                        className={`flex-1 py-3 text-sm font-medium transition ${mode === 'SHAPE' ? 'text-accent-orange border-b-2 border-accent-orange' : 'text-gray-400 hover:text-white'}`}
                    >
                        Shape Factor
                    </button>
                    <button
                        onClick={() => setMode('MANUAL')}
                        className={`flex-1 py-3 text-sm font-medium transition ${mode === 'MANUAL' ? 'text-gray-200 border-b-2 border-gray-200' : 'text-gray-400 hover:text-white'}`}
                    >
                        Manual
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {mode === 'VDOT' && (
                        <div className="space-y-4">
                            <div className="bg-accent-cyan/10 p-3 rounded-lg border border-accent-cyan/20">
                                <p className="text-sm text-accent-cyan">
                                    Calibrate your global Effective VO2max to match your actual race performance.
                                    This updates all your historical data.
                                </p>
                            </div>

                            {/* Activity Selector */}
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Auto-fill from Recent Activity</label>
                                <select
                                    className="w-full bg-[#1f2937] border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-accent-cyan outline-none"
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
                                    <label className="text-xs text-gray-500 mb-1 block">Distance</label>
                                    {isCustomDistance ? (
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                className="w-full bg-[#1f2937] border border-gray-700 rounded px-3 py-2 text-white focus:border-accent-cyan outline-none"
                                                placeholder="Meters"
                                                value={customDistanceMeters}
                                                onChange={(e) => setCustomDistanceMeters(e.target.value)}
                                            />
                                            <button
                                                onClick={() => setIsCustomDistance(false)}
                                                className="text-xs text-accent-cyan underline whitespace-nowrap"
                                            >
                                                Standard
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <select
                                                className="w-full bg-[#1f2937] border border-gray-700 rounded px-3 py-2 text-white focus:border-accent-cyan outline-none"
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
                                                className="text-xs text-accent-cyan underline whitespace-nowrap"
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
                                    className="w-16 bg-gray-800 border border-gray-700 rounded p-2 text-white text-center"
                                    min="0" max="23"
                                />
                                <span className="text-gray-500">:</span>
                                <input
                                    type="number" placeholder="MM" value={vdotMinutes}
                                    onChange={e => setVdotMinutes(validateTimeInput(e.target.value, 59))}
                                    className="w-16 bg-gray-800 border border-gray-700 rounded p-2 text-white text-center"
                                    min="0" max="59"
                                />
                                <span className="text-gray-500">:</span>
                                <input
                                    type="number" placeholder="SS" value={vdotSeconds}
                                    onChange={e => setVdotSeconds(validateTimeInput(e.target.value, 59))}
                                    className="w-16 bg-gray-800 border border-gray-700 rounded p-2 text-white text-center"
                                    min="0" max="59"
                                />
                            </div>

                            {/* Results */}
                            {vdotCalcData && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                        <div className="p-2 bg-gray-800/50 rounded text-center">
                                            <p className="text-gray-500 text-xs">Race VDOT</p>
                                            <p className="text-white font-mono text-lg">{vdotCalcData.impliedVdot.toFixed(1)}</p>
                                        </div>
                                        <div className="p-2 bg-gray-800/50 rounded text-center">
                                            <p className="text-gray-500 text-xs">Current VDOT</p>
                                            <p className="text-gray-300 font-mono text-lg">{vdotCalcData.baseVdot.toFixed(1)}</p>
                                        </div>
                                        <div className="p-2 bg-gray-800/50 rounded text-center">
                                            <p className="text-gray-500 text-xs">Correction</p>
                                            <p className={`font-mono text-lg ${vdotCorrectionValid ? 'text-green-400' : 'text-red-400'}`}>
                                                {vdotCalcData.newFactor.toFixed(3)}x
                                            </p>
                                        </div>
                                    </div>
                                    {!vdotCorrectionValid && (
                                        <p className="text-xs text-red-400">
                                            Correction factor must be between 0.5x and 1.5x. Your race result differs too much from current data.
                                        </p>
                                    )}
                                    <div className="text-xs text-gray-500 text-center">
                                        Current correction: {vdotCorrectionFactor.toFixed(3)}x
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Shape Factor Mode */}
                    {mode === 'SHAPE' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-400">
                                Enter a long-distance race to calibrate the shape penalty (how much training affects predictions).
                            </p>

                            {/* Race Type */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShapeRaceType('MARATHON')}
                                    className={`px-3 py-1.5 rounded text-sm ${shapeRaceType === 'MARATHON' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                                >
                                    Marathon
                                </button>
                                <button
                                    onClick={() => setShapeRaceType('HALF')}
                                    className={`px-3 py-1.5 rounded text-sm ${shapeRaceType === 'HALF' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                                >
                                    Half Marathon
                                </button>
                            </div>

                            {/* Time Input */}
                            <div className="flex gap-2 items-center">
                                <input
                                    type="number" placeholder="HH" value={shapeHours} onChange={e => setShapeHours(e.target.value)}
                                    className="w-16 bg-gray-800 border border-gray-700 rounded p-2 text-white text-center"
                                />
                                <span className="text-gray-500">:</span>
                                <input
                                    type="number" placeholder="MM" value={shapeMinutes} onChange={e => setShapeMinutes(e.target.value)}
                                    className="w-16 bg-gray-800 border border-gray-700 rounded p-2 text-white text-center"
                                />
                                <span className="text-gray-500">:</span>
                                <input
                                    type="number" placeholder="SS" value={shapeSeconds} onChange={e => setShapeSeconds(e.target.value)}
                                    className="w-16 bg-gray-800 border border-gray-700 rounded p-2 text-white text-center"
                                />
                            </div>

                            {/* Comparison + Result */}
                            {shapeCalcData && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="p-2 bg-gray-800/50 rounded text-center">
                                            <p className="text-gray-500 text-xs">Expected</p>
                                            <p className="text-gray-300 font-mono">{formatTime(Math.round(shapeCalcData.basePredictedSeconds))}</p>
                                        </div>
                                        <div className="p-2 bg-gray-800/50 rounded text-center">
                                            <p className="text-gray-500 text-xs">Your Time</p>
                                            <p className="text-white font-mono">{formatTime(shapeCalcData.actualSeconds)}</p>
                                        </div>
                                    </div>
                                    <div className={`p-3 rounded-lg flex justify-between items-center ${isShapeInputValid ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                                        <span className="text-sm text-gray-300">Shape Factor:</span>
                                        <span className={`font-mono text-lg font-bold ${isShapeInputValid ? 'text-green-400' : 'text-red-400'}`}>
                                            {shapeFactor?.toFixed(2)}x
                                        </span>
                                    </div>
                                    {!isShapeInputValid && shapeFactor !== null && (
                                        <p className="text-xs text-red-400">
                                            Factor must be between -2.0x and 2.0x.
                                        </p>
                                    )}
                                    <div className="text-[10px] text-gray-600 font-mono text-center">
                                        VO2:{effectiveVO2max.toFixed(1)} Shape:{shapePercent}% Opt:{Math.round(shapeCalcData.optimalSeconds)}s
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Manual Mode */}
                    {mode === 'MANUAL' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-400">
                                Manually adjust the shape correction factor.
                                <br /> &gt; 1.0 = Slower than predicted (more conservative)
                                <br /> &lt; 1.0 = Faster than predicted (aggressive)
                            </p>

                            <div className="flex gap-4 items-center">
                                <input
                                    type="range" min="0.8" max="1.5" step="0.01"
                                    value={manualFactor}
                                    onChange={e => setManualFactor(e.target.value)}
                                    className="flex-1 accent-accent-pink"
                                />
                                <input
                                    type="number" step="0.01"
                                    value={manualFactor}
                                    onChange={e => setManualFactor(e.target.value)}
                                    className="w-20 bg-gray-800 border border-gray-700 rounded p-2 text-white text-center font-mono"
                                />
                            </div>
                        </div>
                    )}

                    {/* Footer / Status */}
                    <div className="pt-4 border-t border-gray-800 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApply}
                            disabled={
                                isPending ||
                                (mode === 'VDOT' && !vdotCorrectionValid) ||
                                (mode === 'SHAPE' && !isShapeInputValid)
                            }
                            className="btn-primary px-4 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPending ? 'Saving...' : 'Apply Calibration'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
