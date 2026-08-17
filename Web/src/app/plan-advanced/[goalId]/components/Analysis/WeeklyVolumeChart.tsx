'use client';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceArea, ResponsiveContainer,
} from 'recharts';
import type { WeeklyVolumePoint, PhaseBand } from '../../lib/analysisUtils';
import { PHASE_COLORS } from '../../lib/analysisUtils';

interface WeeklyVolumeChartProps {
    data: WeeklyVolumePoint[];
    phaseBands: PhaseBand[];
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: WeeklyVolumePoint }> }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-background-tertiary border border-foreground/20 rounded-lg px-3 py-2 shadow-xl">
            <p className="text-xs text-foreground-secondary">{d.label}</p>
            <p className="text-sm font-medium text-foreground">{d.km} km</p>
            <p className="text-[10px] text-foreground-muted">{d.phase}</p>
        </div>
    );
};

export function WeeklyVolumeChart({ data, phaseBands }: WeeklyVolumeChartProps) {
    if (data.length === 0) return null;

    const maxKm = Math.max(...data.map((d) => d.km), 0);

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
                    label={{ value: 'Running (km)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: "#71717a" } }}
                    domain={[0, Math.ceil(maxKm + 5)]}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                {phaseBands.map((band, i) => (
                    <ReferenceArea
                        key={i}
                        x1={band.startLabel}
                        x2={band.endLabel}
                        fill={band.color}
                        fillOpacity={0.08}
                        label={{
                            value: band.phase,
                            position: 'top',
                            fontSize: 9,
                            fill: band.color,
                            opacity: 0.6,
                        }}
                        ifOverflow="extendDomain"
                    />
                ))}
                <Bar dataKey="km" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    {data.map((d, i) => (
                        <Cell key={i} fill={PHASE_COLORS[d.phase] || '#3b82f6'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
