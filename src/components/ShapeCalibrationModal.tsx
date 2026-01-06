'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Calculator, AlertCircle, Check } from 'lucide-react';
import { solveCalibrationFactor, calculateAllRacePredictions } from '@/lib/metrics/runalyze';
import { formatTime, predictRaceTime } from '@/lib/metrics/vdot';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    currentFactor: number;
    effectiveVO2max: number;
    shapePercent: number;
};

export default function ShapeCalibrationModal({
    isOpen,
    onClose,
    currentFactor,
    effectiveVO2max,
    shapePercent
}: Props) {
    const queryClient = useQueryClient();
    const [mode, setMode] = useState<'RACE' | 'MANUAL'>('RACE');

    // Race Mode State
    const [raceType, setRaceType] = useState<'MARATHON' | 'HALF'>('MARATHON');
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');
    const [seconds, setSeconds] = useState('');

    // Manual Mode State
    const [manualFactor, setManualFactor] = useState(currentFactor.toString());

    // Mutation
    const calibrationMutation = useMutation({
        mutationFn: async (factor: number) => {
            const res = await fetch('/api/goals/calibration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shapeFactor: factor }),
            });
            if (!res.ok) throw new Error('Failed to update calibration');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goals'] }); // Refresh goals to get new factor
            queryClient.invalidateQueries({ queryKey: ['all-activities'] }); // Refresh analytics
            onClose();
        },
    });

    // Calculations for Race Mode
    const raceCalcData = (() => {
        const h = parseInt(hours) || 0;
        const m = parseInt(minutes) || 0;
        const s = parseInt(seconds) || 0;
        const totalSeconds = h * 3600 + m * 60 + s;

        if (totalSeconds <= 0 || effectiveVO2max <= 0) return null;

        const optimalSeconds = predictRaceTime(effectiveVO2max, raceType);
        const shapeImpact = raceType === 'MARATHON' ? 0.30 : 0.15;
        const baseShapePenalty = (1 - Math.min(shapePercent, 100) / 100) * shapeImpact;
        const basePredictedSeconds = optimalSeconds * (1 + baseShapePenalty);

        const factor = solveCalibrationFactor(effectiveVO2max, shapePercent, totalSeconds, raceType);

        return {
            factor,
            actualSeconds: totalSeconds,
            optimalSeconds,
            basePredictedSeconds,
        };
    })();

    const solvedFactor = raceCalcData?.factor || null;
    const isRaceInputValid = solvedFactor !== null && solvedFactor >= 0.5 && solvedFactor <= 2.0;

    const handleApply = () => {
        const factor = mode === 'RACE' ? solvedFactor : parseFloat(manualFactor);
        if (factor) calibrationMutation.mutate(factor);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-900/50">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-accent-pink" />
                        Calibrate Prediction
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-800">
                    <button
                        onClick={() => setMode('RACE')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === 'RACE' ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-gray-300'}`}
                    >
                        By Race Result
                    </button>
                    <button
                        onClick={() => setMode('MANUAL')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === 'MANUAL' ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-gray-300'}`}
                    >
                        Manual Factor
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {mode === 'RACE' ? (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-400">
                                Enter a recent race time to calibrate predictions.
                            </p>

                            {/* Race Type */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setRaceType('MARATHON')}
                                    className={`px-3 py-1.5 rounded text-sm ${raceType === 'MARATHON' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                                >
                                    Marathon
                                </button>
                                <button
                                    onClick={() => setRaceType('HALF')}
                                    className={`px-3 py-1.5 rounded text-sm ${raceType === 'HALF' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                                >
                                    Half Marathon
                                </button>
                            </div>

                            {/* Time Input */}
                            <div className="flex gap-2 items-center">
                                <input
                                    type="number" placeholder="HH" value={hours} onChange={e => setHours(e.target.value)}
                                    className="w-16 bg-gray-800 border border-gray-700 rounded p-2 text-white text-center"
                                />
                                <span className="text-gray-500">:</span>
                                <input
                                    type="number" placeholder="MM" value={minutes} onChange={e => setMinutes(e.target.value)}
                                    className="w-16 bg-gray-800 border border-gray-700 rounded p-2 text-white text-center"
                                />
                                <span className="text-gray-500">:</span>
                                <input
                                    type="number" placeholder="SS" value={seconds} onChange={e => setSeconds(e.target.value)}
                                    className="w-16 bg-gray-800 border border-gray-700 rounded p-2 text-white text-center"
                                />
                            </div>

                            {/* Comparison + Result */}
                            {raceCalcData && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="p-2 bg-gray-800/50 rounded text-center">
                                            <p className="text-gray-500 text-xs">Expected</p>
                                            <p className="text-gray-300 font-mono">{formatTime(raceCalcData.basePredictedSeconds)}</p>
                                        </div>
                                        <div className="p-2 bg-gray-800/50 rounded text-center">
                                            <p className="text-gray-500 text-xs">Your Time</p>
                                            <p className="text-white font-mono">{formatTime(raceCalcData.actualSeconds)}</p>
                                        </div>
                                    </div>
                                    <div className={`p-3 rounded-lg flex justify-between items-center ${isRaceInputValid ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                                        <span className="text-sm text-gray-300">Calibration Factor:</span>
                                        <span className={`font-mono text-lg font-bold ${isRaceInputValid ? 'text-green-400' : 'text-red-400'}`}>
                                            {solvedFactor?.toFixed(2)}x
                                        </span>
                                    </div>
                                    {!isRaceInputValid && solvedFactor !== null && (
                                        <p className="text-xs text-red-400">
                                            Factor must be between 0.5x and 2.0x. Your time differs too much from predictions.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-400">
                                Manually adjust the correction factor.
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
                            disabled={calibrationMutation.isPending || (mode === 'RACE' && !isRaceInputValid)}
                            className="btn-primary px-4 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {calibrationMutation.isPending ? 'Saving...' : 'Apply Calibration'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
