'use client';

import { useMemo } from 'react';
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

function CustomTooltip({ active, payload, label }: any) {
    if (active && payload && payload.length) {
        const ctl = payload.find((p: any) => p.dataKey === 'ctl')?.value;
        const atl = payload.find((p: any) => p.dataKey === 'atl')?.value;
        const tsb = payload.find((p: any) => p.dataKey === 'tsb')?.value;

        let tsbStatus = 'Neutral';
        let tsbColor = '#facc15';
        if (tsb >= 25) {
            tsbStatus = 'Peaked';
            tsbColor = '#4ade80';
        } else if (tsb >= 10) {
            tsbStatus = 'Fresh';
            tsbColor = '#4ade80';
        } else if (tsb <= -25) {
            tsbStatus = 'Very Fatigued';
            tsbColor = '#ef4444';
        } else if (tsb <= -10) {
            tsbStatus = 'Fatigued';
            tsbColor = '#fb923c';
        }

        return (
            <div className="glass-card p-4 border border-white/10">
                <p className="text-gray-400 text-sm mb-2">
                    {format(new Date(label), 'MMM d, yyyy')}
                </p>
                <div className="space-y-1">
                    <p className="text-sm">
                        <span className="text-cyan-400">CTL (Fitness):</span>{' '}
                        <span className="text-white font-medium">{ctl?.toFixed(1)}</span>
                    </p>
                    <p className="text-sm">
                        <span className="text-pink-400">ATL (Fatigue):</span>{' '}
                        <span className="text-white font-medium">{atl?.toFixed(1)}</span>
                    </p>
                    <p className="text-sm">
                        <span style={{ color: tsbColor }}>TSB (Form):</span>{' '}
                        <span className="text-white font-medium">{tsb?.toFixed(1)}</span>
                        <span className="text-gray-400 ml-2">({tsbStatus})</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
}

export function FitnessChart({ data, isLoading }: FitnessChartProps) {
    const chartData = useMemo(() => {
        return data.map((d) => ({
            ...d,
            dateFormatted: format(new Date(d.date), 'MMM d'),
        }));
    }, [data]);

    if (isLoading) {
        return (
            <div className="glass-card p-6 h-80 flex items-center justify-center">
                <div className="animate-pulse text-gray-500">Loading fitness data...</div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="glass-card p-6 h-80 flex flex-col items-center justify-center">
                <span className="text-4xl mb-4">📊</span>
                <p className="text-gray-400">Not enough data for fitness chart</p>
                <p className="text-sm text-gray-500 mt-2">
                    Sync more activities with heart rate data
                </p>
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-gray-300 mb-4">
                Fitness & Form (CTL / ATL / TSB)
            </h3>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                        <defs>
                            <linearGradient id="ctlGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4cc9f0" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#4cc9f0" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="atlGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f72585" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f72585" stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        <XAxis
                            dataKey="dateFormatted"
                            stroke="#52525b"
                            tick={{ fill: '#71717a', fontSize: 12 }}
                            axisLine={{ stroke: '#27272a' }}
                        />
                        <YAxis
                            stroke="#52525b"
                            tick={{ fill: '#71717a', fontSize: 12 }}
                            axisLine={{ stroke: '#27272a' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{ paddingTop: '1rem' }}
                            formatter={(value) => {
                                const labels: Record<string, string> = {
                                    ctl: 'Fitness (CTL)',
                                    atl: 'Fatigue (ATL)',
                                    tsb: 'Form (TSB)',
                                };
                                return <span className="text-gray-400">{labels[value] || value}</span>;
                            }}
                        />

                        {/* Zero line for TSB reference */}
                        <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />

                        {/* CTL - Chronic Training Load (Fitness) */}
                        <Area
                            type="monotone"
                            dataKey="ctl"
                            stroke="#4cc9f0"
                            strokeWidth={2}
                            fill="url(#ctlGradient)"
                        />

                        {/* ATL - Acute Training Load (Fatigue) */}
                        <Area
                            type="monotone"
                            dataKey="atl"
                            stroke="#f72585"
                            strokeWidth={2}
                            fill="url(#atlGradient)"
                        />

                        {/* TSB - Training Stress Balance (Form) */}
                        <Line
                            type="monotone"
                            dataKey="tsb"
                            stroke="#facc15"
                            strokeWidth={2}
                            dot={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Legend explanation */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                    <div className="w-3 h-3 rounded-full bg-cyan-400 mx-auto mb-1" />
                    <p className="text-gray-400">Fitness</p>
                    <p className="text-xs text-gray-500">42-day average</p>
                </div>
                <div className="text-center">
                    <div className="w-3 h-3 rounded-full bg-pink-500 mx-auto mb-1" />
                    <p className="text-gray-400">Fatigue</p>
                    <p className="text-xs text-gray-500">7-day average</p>
                </div>
                <div className="text-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-400 mx-auto mb-1" />
                    <p className="text-gray-400">Form</p>
                    <p className="text-xs text-gray-500">Fitness - Fatigue</p>
                </div>
            </div>
        </div>
    );
}
