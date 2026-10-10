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
            fill={PHASE_COLORS[payload.phase] || '#1f4fa8'}
            stroke="rgba(128,128,140,0.5)"
            strokeWidth={2}
        />
    );
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: LongRunPoint }> }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-background-tertiary border border-foreground/20 rounded-md px-3 py-2">
            <p className="text-xs text-foreground-secondary">{d.date}</p>
            <p className="text-sm font-medium text-foreground">{d.km} km</p>
            <p className="text-[10px] text-foreground-muted">{d.phase}</p>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,140,0.3)" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "#6e747b" }}
                        axisLine={{ stroke: 'rgba(128,128,140,0.45)' }}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: "#6e747b" }}
                        axisLine={false}
                        tickLine={false}
                        label={{ value: 'Distance (km)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: "#6e747b" } }}
                        domain={[0, Math.ceil(maxKm + 2)]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey="km"
                        stroke="#2e7d5b"
                        fill="#2e7d5b"
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
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PHASE_COLORS[p] || '#1f4fa8' }} />
                        <span className="text-[10px] text-foreground-muted">{p}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
