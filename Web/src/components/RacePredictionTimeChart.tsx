'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { predictRaceTime, formatTime, type RaceDistance } from '@/lib/metrics/vdot';

interface VO2DataPoint {
    date?: string;
    week?: string;
    vo2: number;
    vo2Rolling?: number;
}

interface ShapeDataPoint {
    week: string;
    shape: number;
}

interface RacePredictionTimeChartProps {
    vo2TrendData: VO2DataPoint[];
    shapeTrendData?: ShapeDataPoint[];
    calibrationFactor?: number;
    timeRange?: string;
}

// Race colors matching existing RacePredictionChart
const RACE_COLORS = {
    '5K': '#10b981',
    '10K': '#3b82f6',
    'Half': '#f59e0b',
    'Marathon': '#ef4444',
};

type RaceKey = keyof typeof RACE_COLORS;

// Shape impact factors per distance (same as calculateAllRacePredictions in runalyze.ts)
const RACE_DISTANCES: { key: RaceKey; distance: RaceDistance; shapeImpact: number }[] = [
    { key: '5K', distance: '5K', shapeImpact: 0.05 },
    { key: '10K', distance: '10K', shapeImpact: 0.08 },
    { key: 'Half', distance: 'HALF', shapeImpact: 0.15 },
    { key: 'Marathon', distance: 'MARATHON', shapeImpact: 0.30 },
];

function RacePredictionTimeChart({
    vo2TrendData,
    shapeTrendData,
    calibrationFactor = 1.0
}: RacePredictionTimeChartProps) {
    const [visibleRaces, setVisibleRaces] = useState<Record<RaceKey, boolean>>({
        '5K': true,
        '10K': true,
        'Half': true,
        'Marathon': true,
    });

    const toggleRace = useCallback((key: RaceKey) => {
        setVisibleRaces(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    // Create a shape lookup map by week/date
    const shapeByDate = useMemo(() => {
        const map = new Map<string, number>();
        if (shapeTrendData) {
            shapeTrendData.forEach(s => {
                map.set(s.week, s.shape);
            });
        }
        return map;
    }, [shapeTrendData]);

    // Calculate predictions for each VO2 data point with shape adjustments
    const chartData = useMemo(() => {
        if (!vo2TrendData || vo2TrendData.length === 0) return [];

        return vo2TrendData.map(point => {
            const vo2 = point.vo2Rolling || point.vo2;
            const dateStr = point.date || point.week || '';

            if (!vo2 || vo2 <= 0) {
                return { date: dateStr };
            }

            // Get shape for this date (default to 50% if not found)
            const shape = shapeByDate.get(dateStr) ?? 50;

            const dataPoint: Record<string, string | number> = { date: dateStr };

            RACE_DISTANCES.forEach(({ key, distance, shapeImpact }) => {
                // Calculate optimal time from VO2max
                const optimal = predictRaceTime(vo2, distance);

                // Apply shape penalty (same formula as calculateAllRacePredictions)
                const penalty = (1 - Math.min(shape, 100) / 100) * shapeImpact * calibrationFactor;
                const predicted = optimal * (1 + penalty);

                dataPoint[key] = predicted / 60; // Convert to minutes for chart
                dataPoint[`${key}Raw`] = predicted; // Keep raw for tooltip
            });

            return dataPoint;
        }).filter(p => p['5K'] !== undefined); // Only include points with valid predictions
    }, [vo2TrendData, shapeByDate, calibrationFactor]);

    // Format Y-axis to show times
    const formatYAxis = useCallback((minutes: number) => {
        const totalSeconds = Math.round(minutes * 60);
        const hours = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}:${mins.toString().padStart(2, '0')}`;
        }
        return `${mins}m`;
    }, []);

    // Format tooltip
    const formatTooltipValue = useCallback((value: number, name: string) => {
        const totalSeconds = Math.round(value * 60);
        return [formatTime(totalSeconds), name];
    }, []);

    if (!chartData || chartData.length === 0) {
        return (
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Race Prediction Trends</h3>
                <p className="text-foreground-muted">No VO2max data available to show prediction trends</p>
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h3 className="text-lg font-semibold text-foreground">Race Prediction Trends</h3>

                {/* Race Toggle Buttons */}
                <div className="flex flex-wrap gap-2">
                    {RACE_DISTANCES.map(({ key }) => (
                        <button
                            key={key}
                            onClick={() => toggleRace(key)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all border ${visibleRaces[key]
                                ? 'border-transparent text-white shadow-sm'
                                : 'border-glass-border text-foreground-muted hover:text-foreground bg-transparent'
                                }`}
                            style={visibleRaces[key] ? { backgroundColor: RACE_COLORS[key] } : {}}
                        >
                            {key}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-72 min-h-[288px] w-full relative" style={{ minWidth: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="var(--foreground-muted)"
                            fontSize={11}
                            tickLine={false}
                            minTickGap={40}
                            tickFormatter={(val) => {
                                const date = new Date(val);
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            }}
                        />
                        <YAxis
                            stroke="var(--foreground-muted)"
                            fontSize={11}
                            tickLine={false}
                            tickFormatter={formatYAxis}
                            domain={['dataMin - 5', 'dataMax + 5']}
                            width={50}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--glass-bg)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '12px',
                                backdropFilter: 'blur(12px)',
                            }}
                            labelStyle={{ color: 'var(--foreground)', marginBottom: '8px' }}
                            itemStyle={{ fontSize: '12px' }}
                            labelFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            formatter={formatTooltipValue}
                        />
                        <Legend
                            wrapperStyle={{ fontSize: '12px' }}
                            iconType="circle"
                        />

                        {RACE_DISTANCES.map(({ key }) => (
                            visibleRaces[key] && (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={RACE_COLORS[key]}
                                    strokeWidth={2}
                                    dot={false}
                                    isAnimationActive={false}
                                    name={key}
                                    connectNulls
                                />
                            )
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <p className="text-xs text-foreground-muted text-center mt-4">
                Predicted race times based on VO2max and marathon shape over time
            </p>
        </div>
    );
}

export default memo(RacePredictionTimeChart, (prevProps, nextProps) => {
    return (
        prevProps.vo2TrendData === nextProps.vo2TrendData &&
        prevProps.shapeTrendData === nextProps.shapeTrendData &&
        prevProps.calibrationFactor === nextProps.calibrationFactor
    );
});
