'use client';

import { useState, useMemo, memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { predictRaceTime, formatTime } from '@/lib/metrics/vdot';
import { calculateShapePenalty } from '@/lib/metrics/calibration';
import { ChartTooltip } from '@/components/charts/ChartTooltip';

interface RacePredictionChartProps {
    effectiveVO2max: number;
    currentShape: number;
    calibrationFactor?: number;
}

const RACE_COLORS = {
    '5K': 'var(--positive)',
    '10K': 'var(--accent-blue)',
    'Half': 'var(--workout-tempo)',
    'Marathon': 'var(--accent-orange)',
};


function RacePredictionChart({
    effectiveVO2max,
    currentShape,
    calibrationFactor = 1.0
}: RacePredictionChartProps) {
    const [shapePercent, setShapePercent] = useState(currentShape);
    const [simulatedVO2Max, setSimulatedVO2Max] = useState(effectiveVO2max);

    // Sync simulated VO2max when prop changes
    useMemo(() => {
        setSimulatedVO2Max(effectiveVO2max);
    }, [effectiveVO2max]);

    const predictions = useMemo(() => {
        if (simulatedVO2Max <= 0) return [];

        const distances: Array<'5K' | '10K' | 'HALF' | 'MARATHON'> = ['5K', '10K', 'HALF', 'MARATHON'];
        const shapeImpacts = { '5K': 0.05, '10K': 0.08, 'HALF': 0.15, 'MARATHON': 0.30 };
        const labels = { '5K': '5K', '10K': '10K', 'HALF': 'Half', 'MARATHON': 'Marathon' };

        return distances.map(dist => {
            const optimalSeconds = predictRaceTime(simulatedVO2Max, dist);
            const shapeImpact = shapeImpacts[dist];
            const shapePenalty = calculateShapePenalty(shapePercent, shapeImpact, calibrationFactor);
            const predictedSeconds = optimalSeconds * (1 + shapePenalty);

            // Calculate time difference
            const diffSeconds = predictedSeconds - optimalSeconds;
            const diffPercent = (diffSeconds / optimalSeconds) * 100;

            return {
                name: labels[dist],
                optimal: Math.round(optimalSeconds),
                predicted: Math.round(predictedSeconds),
                optimalFormatted: formatTime(Math.round(optimalSeconds)),
                predictedFormatted: formatTime(Math.round(predictedSeconds)),
                diff: Math.round(diffSeconds),
                diffPercent: diffPercent.toFixed(1),
                color: RACE_COLORS[labels[dist] as keyof typeof RACE_COLORS],
            };
        });
    }, [simulatedVO2Max, shapePercent, calibrationFactor]);

    if (effectiveVO2max <= 0) {
        return (
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Race Predictions</h3>
                <p className="text-foreground-muted">No VO2max data available</p>
            </div>
        );
    }

    // Convert to minutes for display
    const chartData = predictions.map(p => ({
        ...p,
        optimalMin: p.optimal / 60,
        predictedMin: p.predicted / 60,
        diffMin: p.diff / 60,
    }));

    return (
        <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    Race Predictions
                    <span className="text-xs font-normal text-foreground-muted bg-foreground/10 px-2 py-1 rounded-full" title="Estimated performance if you raced today based on current fitness and shape">
                        Current Shape
                    </span>
                </h3>
                <div className="flex items-center gap-2 text-sm text-foreground-muted">
                    <span>VO2max:</span>
                    <input
                        type="number"
                        value={simulatedVO2Max}
                        onChange={(e) => setSimulatedVO2Max(parseFloat(e.target.value) || 0)}
                        step="0.1"
                        className="w-16 bg-transparent text-accent-cyan font-semibold font-mono text-right focus:outline-hidden focus:border-b focus:border-accent-cyan"
                    />
                </div>
            </div>

            {/* Sliders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* VO2 Max Slider */}
                <div className="p-3 bg-background-tertiary rounded-md">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-foreground-muted">Simulated VO2 Max</label>
                        <span className="text-base font-semibold text-accent-cyan font-mono tabular-nums">{simulatedVO2Max.toFixed(1)}</span>
                    </div>
                    <input
                        type="range"
                        min="20"
                        max="80"
                        step="0.1"
                        value={simulatedVO2Max}
                        onChange={(e) => setSimulatedVO2Max(parseFloat(e.target.value))}
                        className="w-full h-2 bg-foreground/15 rounded-md appearance-none cursor-pointer accent-accent-cyan"
                    />
                    <div className="flex justify-between text-[10px] text-foreground-muted mt-1">
                        <span>20 (Low)</span>
                        <span className="text-accent-cyan">Current: {effectiveVO2max.toFixed(1)}</span>
                        <span>80 (Elite)</span>
                    </div>
                </div>

                {/* Shape Slider */}
                <div className="p-3 bg-background-tertiary rounded-md">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-foreground-muted">Marathon Shape</label>
                        <span className="text-base font-semibold text-accent-cyan font-mono tabular-nums">{shapePercent}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={shapePercent}
                        onChange={(e) => setShapePercent(parseInt(e.target.value))}
                        className="w-full h-2 bg-foreground/15 rounded-md appearance-none cursor-pointer accent-accent-cyan"
                    />
                    <div className="flex justify-between text-[10px] text-foreground-muted mt-1">
                        <span>0% (Unfit)</span>
                        <span className="text-accent-cyan">Current: {currentShape}%</span>
                        <span>100% (Peak)</span>
                    </div>
                </div>
            </div>

            {/* Prediction Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {predictions.map((p) => (
                    <div key={p.name} className="text-center p-3 bg-background-tertiary rounded-md border-l-4" style={{ borderColor: p.color }}>
                        <p className="text-xs text-foreground-muted mb-1">{p.name}</p>
                        <p className="text-lg font-semibold text-foreground font-mono tabular-nums">{p.predictedFormatted}</p>
                        <p className="text-xs text-foreground-muted font-mono tabular-nums">
                            Optimal: {p.optimalFormatted}
                        </p>
                        {parseFloat(p.diffPercent) > 0 && (
                            <p className="text-xs text-negative mt-1 font-mono tabular-nums">
                                +{p.diffPercent}%
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {/* Bar Chart */}
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                        <XAxis type="number" stroke="var(--foreground-muted)" fontSize={12} tickFormatter={(v) => `${Math.round(v)}m`} />
                        <YAxis type="category" dataKey="name" stroke="var(--foreground-muted)" fontSize={12} width={60} />
                        <Tooltip content={<ChartTooltip formatter={(value: any) => formatTime(Math.round(Number(value) * 60))} />} />
                        <Bar dataKey="optimalMin" fill="var(--foreground-muted)" opacity={0.3} name="Optimal" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="predictedMin" name="Current Prediction" radius={[0, 4, 4, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <p className="text-xs text-foreground-muted text-center mt-4">
                Adjust the sliders to see how fitness and shape affect your race predictions
            </p>
        </div>
    );
}

export default memo(RacePredictionChart, (prevProps, nextProps) => {
    return (
        prevProps.effectiveVO2max === nextProps.effectiveVO2max &&
        prevProps.currentShape === nextProps.currentShape &&
        prevProps.calibrationFactor === nextProps.calibrationFactor
    );
});
