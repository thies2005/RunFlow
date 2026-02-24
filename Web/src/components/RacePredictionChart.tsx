'use client';

import { useState, useMemo, memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { predictRaceTime, formatTime } from '@/lib/metrics/vdot';

interface RacePredictionChartProps {
    effectiveVO2max: number;
    currentShape: number;
    calibrationFactor?: number;
}

const RACE_COLORS = {
    '5K': '#10b981',
    '10K': '#3b82f6',
    'Half': '#f59e0b',
    'Marathon': '#ef4444',
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card p-4 border border-glass-border">
                <p className="text-foreground-muted text-sm mb-2">{label}</p>
                <div className="space-y-1">
                    {payload.map((entry: any, index: number) => {
                        const totalSecs = Math.round(Number(entry.value) * 60);
                        return (
                            <div key={index} className="flex items-center gap-2 text-sm">
                                <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: entry.color || entry.fill }}
                                />
                                <span className="text-foreground-muted">{entry.name}:</span>
                                <span className="text-foreground font-medium">
                                    {formatTime(totalSecs)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return null;
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
            const shapePenalty = (1 - shapePercent / 100) * shapeImpact * calibrationFactor;
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
                <h3 className="text-lg font-semibold text-white mb-4">Race Predictions</h3>
                <p className="text-gray-400">No VO2max data available</p>
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
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    Race Predictions
                    <span className="text-xs font-normal text-gray-400 bg-white/10 px-2 py-1 rounded-full" title="Estimated performance if you raced today based on current fitness and shape">
                        Current Shape
                    </span>
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>VO2max:</span>
                    <input
                        type="number"
                        value={simulatedVO2Max}
                        onChange={(e) => setSimulatedVO2Max(parseFloat(e.target.value) || 0)}
                        step="0.1"
                        className="w-16 bg-transparent text-accent-orange font-bold text-right focus:outline-none focus:border-b focus:border-accent-orange"
                    />
                </div>
            </div>

            {/* Sliders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* VO2 Max Slider */}
                <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-gray-400">Simulated VO2 Max</label>
                        <span className="text-base font-bold text-accent-orange">{simulatedVO2Max.toFixed(1)}</span>
                    </div>
                    <input
                        type="range"
                        min="20"
                        max="80"
                        step="0.1"
                        value={simulatedVO2Max}
                        onChange={(e) => setSimulatedVO2Max(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent-orange"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                        <span>20 (Low)</span>
                        <span className="text-accent-orange">Current: {effectiveVO2max.toFixed(1)}</span>
                        <span>80 (Elite)</span>
                    </div>
                </div>

                {/* Shape Slider */}
                <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-gray-400">Marathon Shape</label>
                        <span className="text-base font-bold text-accent-cyan">{shapePercent}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={shapePercent}
                        onChange={(e) => setShapePercent(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent-cyan"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                        <span>0% (Unfit)</span>
                        <span className="text-accent-cyan">Current: {currentShape}%</span>
                        <span>100% (Peak)</span>
                    </div>
                </div>
            </div>

            {/* Prediction Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {predictions.map((p) => (
                    <div key={p.name} className="text-center p-3 bg-white/5 rounded-lg border-l-4" style={{ borderColor: p.color }}>
                        <p className="text-xs text-gray-400 mb-1">{p.name}</p>
                        <p className="text-lg font-bold text-white">{p.predictedFormatted}</p>
                        <p className="text-xs text-gray-500">
                            Optimal: {p.optimalFormatted}
                        </p>
                        {parseFloat(p.diffPercent) > 0 && (
                            <p className="text-xs text-red-400 mt-1">
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
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                        <XAxis type="number" stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `${Math.round(v)}m`} />
                        <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={12} width={60} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="optimalMin" fill="#4ade80" opacity={0.3} name="Optimal" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="predictedMin" name="Current Prediction" radius={[0, 4, 4, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
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
