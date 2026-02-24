'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Calendar as CalendarIcon, Activity as ActivityIcon } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, subDays, isSameDay, startOfDay } from 'date-fns';

type TimeRange = '1W' | '1M' | '6M' | '1Y' | 'ALL';

interface SupplementStatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetId: string | null; // Can be supplementId or stackId
    targetType: 'supplement' | 'stack' | null;
    targetName: string;
}

const RANGES: TimeRange[] = ['1W', '1M', '6M', '1Y', 'ALL'];

export function SupplementStatsModal({ isOpen, onClose, targetId, targetType, targetName }: SupplementStatsModalProps) {
    const [timeRange, setTimeRange] = useState<TimeRange>('1M');

    const { data: statsData, isLoading } = useQuery({
        queryKey: ['supplement-stats', targetId, targetType, timeRange],
        queryFn: async () => {
            if (!targetId || !targetType) return null;
            const paramName = targetType === 'stack' ? 'stackId' : 'supplementId';
            const res = await fetch(`/api/health/supplements/stats?${paramName}=${targetId}&range=${timeRange}`);
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        },
        enabled: isOpen && !!targetId && !!targetType,
    });

    if (!isOpen) return null;

    // Process data for charts
    const rawLogs = statsData?.logs || [];

    // Generate full date range for chart
    const generateChartData = () => {
        const today = new Date();
        const data = [];
        let daysToGenerate = 30;

        switch (timeRange) {
            case '1W': daysToGenerate = 7; break;
            case '1M': daysToGenerate = 30; break;
            case '6M': daysToGenerate = 180; break;
            case '1Y': daysToGenerate = 365; break;
            case 'ALL': daysToGenerate = 365; break; // Clamp to 1Y for now if ALL is passed but not fully supported by history
        }

        for (let i = daysToGenerate - 1; i >= 0; i--) {
            const date = subDays(today, i);
            const dateStr = format(date, 'yyyy-MM-dd');
            const logFound = rawLogs.find((l: any) => l.dateStr === dateStr);

            data.push({
                dateStr,
                date: date,
                takenValue: logFound ? 1 : 0,
            });
        }
        return data;
    };

    const chartData = generateChartData();

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center">
            <div className="bg-[#1c1c1e] w-full max-w-2xl rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden animate-in slide-in-from-bottom">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <ActivityIcon className="w-5 h-5 text-blue-400" />
                            Statistics
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">{targetName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors" type="button">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto flex-1 space-y-6">
                    {/* Time Range Selector */}
                    <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 shrink-0 w-full sm:w-auto self-start sm:self-end">
                        {RANGES.map(range => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${timeRange === range
                                    ? 'bg-white/10 text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-300'
                                    }`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Hero Stat */}
                            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-5 flex flex-col items-center justify-center text-center">
                                <span className="text-4xl font-black text-white mb-1">
                                    {statsData?.successRate || 0}<span className="text-xl text-blue-400">%</span>
                                </span>
                                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{timeRange} Adherence</span>
                            </div>

                            {/* Chart Map */}
                            <div className="flex-1 w-full relative min-h-[200px]">
                                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
                                    <CalendarIcon className="w-4 h-4 text-gray-400" /> History Map
                                </h3>
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis
                                                dataKey="dateStr"
                                                stroke="#4b5563"
                                                fontSize={10}
                                                tickLine={false}
                                                minTickGap={timeRange === '1M' ? 5 : 20}
                                                tickFormatter={(val) => {
                                                    const date = new Date(val);
                                                    if (timeRange === '1W' || timeRange === '1M') {
                                                        return format(date, 'MMM d');
                                                    }
                                                    return format(date, 'MMM yy');
                                                }}
                                            />
                                            <YAxis hide domain={[0, 1]} />
                                            <Tooltip
                                                contentStyle={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                                labelStyle={{ color: '#fff' }}
                                                itemStyle={{ color: '#fff' }}
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                labelFormatter={(val) => format(new Date(val), 'EEEE, MMM d, yyyy')}
                                                formatter={(value) => [value === 1 ? 'Taken' : 'Missed', 'Status']}
                                            />
                                            <Bar
                                                dataKey="takenValue"
                                                name="Status"
                                                fill="#4ade80" // green-400
                                                radius={[2, 2, 0, 0]}
                                                isAnimationActive={false}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 justify-end">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded bg-white/5 border border-white/5" /> Missed
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded bg-green-500" /> Taken
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
