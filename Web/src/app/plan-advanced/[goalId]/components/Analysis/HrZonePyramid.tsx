'use client';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import type { HrZoneBar } from '../../lib/analysisUtils';

interface HrZonePyramidProps {
    data: HrZoneBar[];
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: HrZoneBar }> }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-background-tertiary border border-foreground/20 rounded-lg px-3 py-2 shadow-xl">
            <p className="text-xs text-foreground-secondary">{d.name}</p>
            <p className="text-sm font-medium text-foreground">{d.km} km</p>
        </div>
    );
};

export function HrZonePyramid({ data }: HrZonePyramidProps) {
    if (data.length === 0) return null;

    const totalKm = data.reduce((s, d) => s + d.km, 0);
    const hasZones12 = data.filter((d) => d.zone <= 2).reduce((s, d) => s + d.km, 0);
    const pct8020 = totalKm > 0 ? (hasZones12 / totalKm) * 100 : 0;

    return (
        <div>
            <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,140,0.3)" horizontal={false} />
                    <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: "#71717a" }}
                        axisLine={false}
                        tickLine={false}
                        label={{ value: 'km', position: 'bottom', style: { fontSize: 11, fill: "#71717a" } }}
                    />
                    <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "#71717a" }}
                        axisLine={false}
                        tickLine={false}
                        width={110}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    {pct8020 > 0 && (
                        <ReferenceLine
                            x={totalKm * 0.8}
                            stroke="#facc15"
                            strokeDasharray="4 4"
                            label={{
                                value: `80/20 threshold`,
                                position: 'top',
                                fontSize: 9,
                                fill: '#facc15',
                            }}
                        />
                    )}
                    <Bar dataKey="km" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                        {data.map((d, i) => (
                            <Cell key={i} fill={d.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-2 mt-1 px-2">
                <span className="text-[10px] text-foreground-muted">Z1+Z2: {Math.round(pct8020)}%</span>
                <span className="text-[10px] text-foreground-muted">(80/20 target)</span>
            </div>
        </div>
    );
}
