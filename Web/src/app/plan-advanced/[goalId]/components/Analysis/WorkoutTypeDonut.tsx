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
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
            <p className="text-sm font-medium text-zinc-100">{d.type}</p>
            <p className="text-xs text-zinc-400">{d.count} sessions ({d.pct}%)</p>
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
                        labelLine={{ stroke: '#3f3f46' }}
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
                <span className="text-xl font-bold text-zinc-100">{totalCount}</span>
                <span className="text-[10px] text-zinc-500">sessions</span>
            </div>
        </div>
    );
}
