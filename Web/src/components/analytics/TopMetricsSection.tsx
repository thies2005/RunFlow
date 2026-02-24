'use client';

import { Settings2 } from 'lucide-react';
import { formatTime } from '@/lib/metrics/vdot';

interface TopMetricsSectionProps {
    runalyzeMetrics: any;
    setIsCalibrationOpen: (open: boolean) => void;
}

export default function TopMetricsSection({ runalyzeMetrics, setIsCalibrationOpen }: TopMetricsSectionProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Effective VO2max */}
            <div className="glass-card p-6 text-center">
                <p className="text-foreground-muted text-sm mb-2">Effective VO2max</p>
                <p className="text-4xl font-bold text-foreground">
                    {runalyzeMetrics.effectiveVO2max > 0 ? runalyzeMetrics.effectiveVO2max.toFixed(1) : '-'}
                </p>
                <p className="text-xs text-foreground-muted mt-1">Pace + Heart Rate based</p>
            </div>

            {/* Marathon Shape */}
            <div className="glass-card p-6 text-center">
                <p className="text-foreground-muted text-sm mb-2">Marathon Shape</p>
                <p className={`text-4xl font-bold ${runalyzeMetrics.shape >= 100 ? 'text-green-400' :
                    runalyzeMetrics.shape >= 70 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                    {runalyzeMetrics.shape}%
                </p>
                <div className="flex justify-center gap-4 mt-2 text-xs text-foreground-muted">
                    <span>Mil: {runalyzeMetrics.mileageScore}%</span>
                    <span>LR: {runalyzeMetrics.longRunScore}%</span>
                    {runalyzeMetrics.crossTrainingScore > 0 && (
                        <span>XT: {runalyzeMetrics.crossTrainingScore}%</span>
                    )}
                </div>
            </div>

            {/* Predictions */}
            <div className="glass-card p-6 text-center relative">
                <button
                    onClick={() => setIsCalibrationOpen(true)}
                    className="absolute top-2 right-2 p-2 text-gray-500 hover:text-accent-pink transition"
                    title="Calibrate"
                >
                    <Settings2 className="w-4 h-4" />
                </button>
                <p className="text-gray-400 text-sm mb-2">Marathon Prediction</p>
                <div className="flex justify-center items-baseline gap-3">
                    <div>
                        <p className="text-xs text-gray-500">Optimal</p>
                        <p className="text-lg font-semibold text-green-400">
                            {runalyzeMetrics.optimalTime > 0 ? formatTime(runalyzeMetrics.optimalTime) : '-'}
                        </p>
                    </div>
                    <span className="text-gray-600">→</span>
                    <div>
                        <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                            Predicted
                            {runalyzeMetrics.calibrationFactor !== 1.0 && (
                                <span className="text-accent-blue text-[10px] bg-accent-blue/10 px-1 rounded">
                                    {runalyzeMetrics.calibrationFactor.toFixed(2)}x
                                </span>
                            )}
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                            {runalyzeMetrics.predictedTime > 0 ? formatTime(runalyzeMetrics.predictedTime) : '-'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
