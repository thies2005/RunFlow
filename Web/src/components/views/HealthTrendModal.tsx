'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ActivitySquare, Activity, Plus } from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

type TimeRange = '1W' | '1M' | '6M' | '1Y' | 'ALL';

interface HealthTrendModalProps {
    isOpen: boolean;
    onClose: () => void;
    metric: 'steps' | 'weight' | null;
}

const RANGES: TimeRange[] = ['1W', '1M', '6M', '1Y', 'ALL'];

export function HealthTrendModal({ isOpen, onClose, metric }: HealthTrendModalProps) {
    const queryClient = useQueryClient();
    const [timeRange, setTimeRange] = useState<TimeRange>('1M');
    const [isEnteringWeight, setIsEnteringWeight] = useState(false);
    const [manualWeight, setManualWeight] = useState('');

    const logWeightMutation = useMutation({
        mutationFn: async (weight: number) => {
            const todayStr = new Date().toISOString().split('T')[0];
            const res = await fetch('/api/health/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: todayStr,
                    action: 'updateHealth',
                    weight
                })
            });
            if (!res.ok) throw new Error('Failed to log weight');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['health-history'] });
            queryClient.invalidateQueries({ queryKey: ['daily-health'] });
            setIsEnteringWeight(false);
            setManualWeight('');
        }
    });

    // Fetch historical data
    const { data: historyData, isLoading } = useQuery({
        queryKey: ['health-history', timeRange],
        queryFn: async () => {
            const res = await fetch(`/api/health/history?range=${timeRange}`);
            if (!res.ok) throw new Error('Failed to fetch health history');
            return res.json();
        },
        enabled: isOpen && !!metric
    });

    if (!isOpen || !metric) return null;

    // Process data for charts
    const rawData = historyData?.history || [];

    // Process rolling average for weight (7-day window)
    const chartData = rawData.map((d: any, index: number) => {
        const item = { ...d };

        if (metric === 'weight' && d.weight) {
            let sum = 0;
            let count = 0;

            // Calculate 7-day rolling average
            for (let i = index; i >= 0 && index - i < 7; i--) {
                if (rawData[i].weight) {
                    sum += rawData[i].weight;
                    count++;
                }
            }

            if (count > 0) {
                item.weightRolling = Math.round((sum / count) * 10) / 10;
            }
        }

        return item;
    });

    const isSteps = metric === 'steps';
    const MetricIcon = isSteps ? ActivitySquare : Activity;
    const metricColor = isSteps ? '#4ade80' : '#60a5fa'; // green-400 : blue-400
    const title = isSteps ? 'Steps History' : 'Weight History';

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center">
            <div
                className="bg-[#1c1c1e] w-full max-w-2xl rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden animate-in slide-in-from-bottom"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <MetricIcon className="w-5 h-5" style={{ color: metricColor }} />
                        {title}
                    </h2>
                    <div className="flex items-center gap-2">
                        {metric === 'weight' && (
                            <button
                                onClick={() => setIsEnteringWeight(true)}
                                className="p-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" /> Log
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors"
                            type="button"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Manual Weight Entry */}
                {isEnteringWeight && metric === 'weight' && (
                    <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center gap-2">
                        <input
                            type="number"
                            step="0.1"
                            value={manualWeight}
                            onChange={(e) => setManualWeight(e.target.value)}
                            placeholder="Weight in kg"
                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                            autoFocus
                        />
                        <button
                            onClick={() => {
                                const w = parseFloat(manualWeight);
                                if (!isNaN(w) && w > 0) logWeightMutation.mutate(w);
                            }}
                            disabled={logWeightMutation.isPending || !manualWeight}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                        >
                            {logWeightMutation.isPending ? '...' : 'Save'}
                        </button>
                        <button
                            onClick={() => setIsEnteringWeight(false)}
                            className="px-4 py-2 bg-black/40 hover:bg-white/10 text-gray-300 text-sm font-semibold rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col min-h-[400px]">
                    {/* Time Range Selector */}
                    <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 mb-6 shrink-0 w-full sm:w-auto self-start sm:self-end">
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

                    {/* Chart Container */}
                    <div className="flex-1 w-full relative min-h-[300px]">
                        {isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="animate-pulse text-gray-500">Loading chart data...</div>
                            </div>
                        ) : chartData.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-gray-500 text-sm">No historical data found for this range.</div>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                {isSteps ? (
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                                        <XAxis
                                            dataKey="dateStr"
                                            stroke="var(--foreground-muted)"
                                            fontSize={11}
                                            tickLine={false}
                                            minTickGap={timeRange === '1M' ? 5 : 20}
                                            tickFormatter={(val) => {
                                                const date = new Date(val);
                                                if (timeRange === '1W' || timeRange === '1M') {
                                                    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                                                }
                                                return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                                            }}
                                        />
                                        <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', backdropFilter: 'blur(12px)' }}
                                            labelStyle={{ color: 'var(--foreground)' }}
                                            itemStyle={{ color: 'var(--foreground)' }}
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            labelFormatter={(val) => new Date(val).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                        />
                                        <Bar
                                            dataKey="steps"
                                            name="Steps"
                                            fill={metricColor}
                                            radius={[4, 4, 0, 0]}
                                            isAnimationActive={false}
                                        />
                                    </BarChart>
                                ) : (
                                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                                        <XAxis
                                            dataKey="dateStr"
                                            stroke="var(--foreground-muted)"
                                            fontSize={11}
                                            tickLine={false}
                                            minTickGap={timeRange === '1M' ? 5 : 20}
                                            tickFormatter={(val) => {
                                                const date = new Date(val);
                                                if (timeRange === '1W' || timeRange === '1M') {
                                                    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                                                }
                                                return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                                            }}
                                        />
                                        <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} domain={['dataMin - 1', 'auto']} />
                                        <Tooltip
                                            contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', backdropFilter: 'blur(12px)' }}
                                            labelStyle={{ color: 'var(--foreground)' }}
                                            itemStyle={{ color: 'var(--foreground)' }}
                                            labelFormatter={(val) => new Date(val).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                        />

                                        {/* Raw daily data points */}
                                        <Line
                                            type="monotone"
                                            dataKey="weight"
                                            name="Daily Weight (kg) "
                                            stroke="rgba(96, 165, 250, 0.3)"
                                            strokeWidth={1}
                                            dot={{ r: 2, fill: metricColor, fillOpacity: 0.5 }}
                                            isAnimationActive={false}
                                        />

                                        {/* Smoothed rolling average */}
                                        <Line
                                            type="monotone"
                                            dataKey="weightRolling"
                                            name="7-day Avg (kg) "
                                            stroke={metricColor}
                                            strokeWidth={3}
                                            dot={false}
                                            isAnimationActive={false}
                                        />
                                    </LineChart>
                                )}
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
