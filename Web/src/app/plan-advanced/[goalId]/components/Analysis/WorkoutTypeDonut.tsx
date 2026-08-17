'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { WorkoutTypeSlice } from '../../lib/analysisUtils';

interface WorkoutTypeDonutProps {
    data: WorkoutTypeSlice[];
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: WorkoutTypeSlice }> }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-background-tertiary border border-foreground/20 rounded-lg px-3 py-2 shadow-xl">
            <p className="text-sm font-medium text-foreground">{d.type}</p>
            <p className="text-xs text-foreground-secondary">{d.count} sessions ({d.pct}%)</p>
        </div>
    );
};

const renderLabel = ({ name, pct }: { name: string; pct: number }) =>
    `${name} ${pct}%`;

export function WorkoutTypeDonut({ data }: WorkoutTypeDonutProps) {
    if (data.length === 0) return null;

    const totalCount = data.reduce((s, d) => s + d.count, 0);

    return (
        <div className="relative">
            <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        dataKey="count"
                        nameKey="type"
                        label={renderLabel}
                        labelLine={{ stroke: 'rgba(128,128,140,0.45)' }}
                        isAnimationActive={false}
                    >
                        {data.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: -20 }}>
                <span className="text-xl font-bold text-foreground">{totalCount}</span>
                <span className="text-[10px] text-foreground-muted">sessions</span>
            </div>
        </div>
    );
}
