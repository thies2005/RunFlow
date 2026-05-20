'use client';

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { LongRunPoint } from '../../lib/analysisUtils';
import { PHASE_COLORS } from '../../lib/analysisUtils';

interface LongRunProgressionChartProps {
    data: LongRunPoint[];
}

const CustomDot = (props: { cx?: number; cy?: number; payload?: LongRunPoint }) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || !payload) return null;
    return (
        <circle
            cx={cx}
            cy={cy}
            r={4}
            fill={PHASE_COLORS[payload.phase] || '#3b82f6'}
            stroke="#18181b"
            strokeWidth={2}
        />
    );
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: LongRunPoint }> }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
            <p className="text-xs text-zinc-400">{d.date}</p>
            <p className="text-sm font-medium text-zinc-100">{d.km} km</p>
            <p className="text-[10px] text-zinc-500">{d.phase}</p>
        </div>
    );
};

export function LongRunProgressionChart({ data }: LongRunProgressionChartProps) {
    if (data.length === 0) return null;

    const maxKm = Math.max(...data.map((d) => d.km), 0);

    const phasesPresent = [...new Set(data.map((d) => d.phase))];

    return (
        <div>
            <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#71717a' }}
                        axisLine={{ stroke: '#3f3f46' }}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: '#71717a' }}
                        axisLine={false}
                        tickLine={false}
                        label={{ value: 'Distance (km)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#71717a' } }}
                        domain={[0, Math.ceil(maxKm + 2)]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey="km"
                        stroke="#22c55e"
                        fill="#22c55e"
                        fillOpacity={0.15}
                        strokeWidth={2}
                        dot={<CustomDot />}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 px-2">
                {phasesPresent.map((p) => (
                    <div key={p} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PHASE_COLORS[p] || '#3b82f6' }} />
                        <span className="text-[10px] text-zinc-500">{p}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
