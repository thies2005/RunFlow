'use client';

import { useMemo, memo } from 'react';
import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { BarChart2 } from 'lucide-react';
import { ChartTooltip } from '@/components/charts/ChartTooltip';

interface FitnessDataPoint {
    date: string;
    ctl: number;
    atl: number;
    tsb: number;
}

interface FitnessChartProps {
    data: FitnessDataPoint[];
    isLoading?: boolean;
}


function FitnessChart({ data, isLoading }: FitnessChartProps) {
    // Memoize chart data with better dependency tracking
    // Only depend on date strings and values, not the entire array reference
    const chartData = useMemo(() => {
        return data.map((d) => ({
            ...d,
            dateFormatted: format(new Date(d.date), 'MMM d'),
        }));
    }, [data]);

    if (isLoading) {
        return (
            <div className="glass-card p-6 h-80 flex items-center justify-center">
                <div className="animate-pulse text-foreground-muted">Loading fitness data...</div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="glass-card p-6 h-80 flex flex-col items-center justify-center">
                <BarChart2 className="w-16 h-16 mx-auto text-foreground-muted mb-4" />
                <p className="text-foreground-muted">Not enough data for fitness chart</p>
                <p className="sm text-foreground-muted mt-2">
                    Sync more activities with heart rate data
                </p>
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
                Fitness & Form (CTL / ATL / TSB)
            </h3>

            <div className="h-64" role="img" aria-label="Fitness and form chart showing CTL (fitness), ATL (fatigue), and TSB (form) trends over time">
                <span className="sr-only">
                    {`Fitness trend chart with ${chartData.length} data points. Latest values: CTL ${chartData[chartData.length - 1]?.ctl?.toFixed(1)}, ATL ${chartData[chartData.length - 1]?.atl?.toFixed(1)}, TSB ${chartData[chartData.length - 1]?.tsb?.toFixed(1)}`}
                </span>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                        <defs>
                            <linearGradient id="ctlGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="atlGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        <XAxis
                            dataKey="dateFormatted"
                            stroke="var(--foreground-muted)"
                            tick={{ fill: 'var(--foreground-muted)', fontSize: 12 }}
                            axisLine={{ stroke: 'var(--glass-border)' }}
                        />
                        <YAxis
                            stroke="var(--foreground-muted)"
                            tick={{ fill: 'var(--foreground-muted)', fontSize: 12 }}
                            axisLine={{ stroke: 'var(--glass-border)' }}
                        />
                        <Tooltip content={<ChartTooltip
                            labelFormatter={(label: any) => format(new Date(label), 'MMM d, yyyy')}
                            formatter={(value: any, name: string) => {
                                if (name === 'tsb' || name === 'Form (TSB)') {
                                    let tsbStatus = 'Neutral';
                                    if (value >= 25) tsbStatus = 'Peaked';
                                    else if (value >= 10) tsbStatus = 'Fresh';
                                    else if (value <= -25) tsbStatus = 'Very Fatigued';
                                    else if (value <= -10) tsbStatus = 'Fatigued';

                                    return [
                                        <span key="tsb-val">{value?.toFixed(1)} <span className="text-foreground-muted ml-1">({tsbStatus})</span></span>,
                                        'Form (TSB)'
                                    ];
                                }
                                if (name === 'ctl' || name === 'Fitness (CTL)') return [value?.toFixed(1), 'Fitness (CTL)'];
                                if (name === 'atl' || name === 'Fatigue (ATL)') return [value?.toFixed(1), 'Fatigue (ATL)'];
                                return typeof value === 'number' ? value.toFixed(1) : value;
                            }}
                        />} />
                        <Legend
                            wrapperStyle={{ paddingTop: '1rem' }}
                            formatter={(value) => {
                                const labels: Record<string, string> = {
                                    ctl: 'Fitness (CTL)',
                                    atl: 'Fatigue (ATL)',
                                    tsb: 'Form (TSB)',
                                };
                                return <span className="text-foreground-muted">{labels[value] || value}</span>;
                            }}
                        />

                        {/* Zero line for TSB reference */}
                        <ReferenceLine y={0} stroke="var(--foreground-muted)" strokeDasharray="3 3" />

                        {/* CTL - Chronic Training Load (Fitness) */}
                        <Area
                            type="monotone"
                            dataKey="ctl"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fill="url(#ctlGradient)"
                        />

                        {/* ATL - Acute Training Load (Fatigue) */}
                        <Area
                            type="monotone"
                            dataKey="atl"
                            stroke="#ef4444"
                            strokeWidth={2}
                            fill="url(#atlGradient)"
                        />

                        {/* TSB - Training Stress Balance (Form) */}
                        <Line
                            type="monotone"
                            dataKey="tsb"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Legend explanation */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mx-auto mb-1" />
                    <p className="text-foreground-muted">Fitness</p>
                    <p className="xs text-foreground-muted opacity-70">42-day average</p>
                </div>
                <div className="text-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mx-auto mb-1" />
                    <p className="text-foreground-muted">Fatigue</p>
                    <p className="xs text-foreground-muted opacity-70">7-day average</p>
                </div>
                <div className="text-center">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 mx-auto mb-1" />
                    <p className="text-foreground-muted">Form</p>
                    <p className="xs text-foreground-muted opacity-70">Fitness - Fatigue</p>
                </div>
            </div>
        </div>
    );
}

// Memoize component to prevent unnecessary re-renders
export default memo(FitnessChart, (prevProps, nextProps) => {
    return (
        prevProps.data === nextProps.data &&
        prevProps.isLoading === nextProps.isLoading
    );
});
