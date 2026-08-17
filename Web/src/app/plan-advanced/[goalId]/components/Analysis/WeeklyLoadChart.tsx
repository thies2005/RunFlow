'use client';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { WeeklyLoadPoint } from '../../lib/analysisUtils';

interface WeeklyLoadChartProps {
    data: WeeklyLoadPoint[];
}

const MODALITY_COLORS = {
    run: '#14b8a6',
    bike: '#f97316',
    swim: '#3b82f6',
    strength: '#a855f7',
};

const MODALITY_LABELS: Record<string, string> = {
    run: 'Run',
    bike: 'Bike',
    swim: 'Swim',
    strength: 'Strength',
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-background-tertiary border border-foreground/20 rounded-lg px-3 py-2 shadow-xl">
            <p className="text-xs text-foreground-secondary mb-1">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-foreground-secondary">{MODALITY_LABELS[entry.dataKey] || entry.dataKey}:</span>
                    <span className="text-foreground font-medium">{entry.value}h</span>
                </div>
            ))}
        </div>
    );
};

export function WeeklyLoadChart({ data }: WeeklyLoadChartProps) {
    if (data.length === 0) return null;

    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,140,0.3)" />
                <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#71717a" }}
                    axisLine={{ stroke: 'rgba(128,128,140,0.45)' }}
                    tickLine={false}
                />
                <YAxis
                    tick={{ fontSize: 11, fill: "#71717a" }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: "#71717a" } }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    formatter={(value: string) => <span className="text-xs text-foreground-secondary">{MODALITY_LABELS[value] || value}</span>}
                    wrapperStyle={{ paddingTop: 8 }}
                />
                <Bar dataKey="run" stackId="load" fill={MODALITY_COLORS.run} isAnimationActive={false} radius={data.every((d) => d.run === 0) ? [0, 0, 0, 0] : undefined} />
                <Bar dataKey="bike" stackId="load" fill={MODALITY_COLORS.bike} isAnimationActive={false} />
                <Bar dataKey="swim" stackId="load" fill={MODALITY_COLORS.swim} isAnimationActive={false} />
                <Bar dataKey="strength" stackId="load" fill={MODALITY_COLORS.strength} isAnimationActive={false} radius={[3, 3, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}
