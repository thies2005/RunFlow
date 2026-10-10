'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ActivitySquare, Activity, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { BodyCompositionTab } from './BodyCompositionTab';
import { formatUtcDayKey, getCurrentUtcDayKey } from '@/lib/health/dates';

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
    const [activeTab, setActiveTab] = useState<'weight' | 'composition'>('weight');
    const [isEnteringWeight, setIsEnteringWeight] = useState(false);
    const [manualWeight, setManualWeight] = useState('');

    const logWeightMutation = useMutation({
        mutationFn: async (weight: number) => {
            const todayStr = getCurrentUtcDayKey();
            const res = await fetch('/api/health/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: todayStr,
                    action: 'updateHealth',
                    weight,
                    source: 'manual'
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
            toast.success('Weight logged');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to log weight');
        }
    });

    const formatChartDate = (dayKey: string, options: Intl.DateTimeFormatOptions) =>
        formatUtcDayKey(dayKey, options);

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
    const metricColor = isSteps ? 'var(--positive)' : 'var(--accent-blue)';
    const title = isSteps ? 'Steps History' : 'Weight History';

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 sm:items-center sm:justify-center">
            <div
                className="bg-background-secondary border border-line w-full max-w-2xl rounded-t-md sm:rounded-md flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom"
            >
                {/* Header */}
                <div className="flex flex-col border-b border-line shrink-0">
                    <div className="flex items-center justify-between p-4 pb-2">
                        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <MetricIcon className="w-5 h-5" style={{ color: metricColor }} />
                            {metric === 'weight' ? 'Body Metrics' : title}
                        </h2>
                        <div className="flex items-center gap-2">
                            {metric === 'weight' && activeTab === 'weight' && (
                                <button
                                    onClick={() => setIsEnteringWeight(true)}
                                    className="p-1.5 bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 rounded-md transition-colors text-xs font-semibold flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" /> Log
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 text-foreground-muted hover:text-foreground transition-colors"
                                type="button"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {metric === 'weight' && (
                        <div className="flex gap-4 px-4">
                            <button
                                onClick={() => setActiveTab('weight')}
                                className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'weight' ? 'text-foreground border-accent-blue' : 'text-foreground-muted border-transparent hover:text-foreground-muted'}`}
                            >
                                Weight History
                            </button>
                            <button
                                onClick={() => setActiveTab('composition')}
                                className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'composition' ? 'text-foreground border-accent-orange' : 'text-foreground-muted border-transparent hover:text-foreground-muted'}`}
                            >
                                Body Composition
                            </button>
                        </div>
                    )}
                </div>

                {/* Manual Weight Entry */}
                {isEnteringWeight && metric === 'weight' && (
                    <div className="px-4 py-3 bg-background-tertiary border-b border-line flex items-center gap-2">
                        <input
                            type="number"
                            step="0.1"
                            value={manualWeight}
                            onChange={(e) => setManualWeight(e.target.value)}
                            placeholder="Weight in kg"
                            className="flex-1 bg-background-tertiary border border-line rounded-md px-3 py-2 text-sm text-foreground placeholder-foreground-muted focus:outline-hidden"
                            autoFocus
                        />
                        <button
                            onClick={() => {
                                const w = parseFloat(manualWeight);
                                if (!isNaN(w) && w > 0) logWeightMutation.mutate(w);
                            }}
                            disabled={logWeightMutation.isPending || !manualWeight}
                            className="px-4 py-2 bg-accent-orange hover:bg-accent-orange/90 text-white text-sm font-semibold rounded-md transition-colors disabled:opacity-50"
                        >
                            {logWeightMutation.isPending ? '...' : 'Save'}
                        </button>
                        <button
                            onClick={() => setIsEnteringWeight(false)}
                            className="px-4 py-2 bg-background-tertiary hover:bg-glass-bg-hover text-foreground-muted text-sm font-semibold rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col min-h-[400px]">
                    {metric === 'weight' && activeTab === 'composition' ? (
                        <BodyCompositionTab />
                    ) : (
                        <>
                            {/* Time Range Selector */}
                            <div className="flex bg-background-tertiary p-1 rounded-md border border-line mb-6 shrink-0 w-full sm:w-auto self-start sm:self-end">
                        {RANGES.map(range => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-semibold rounded-sm transition-colors ${timeRange === range
                                    ? 'bg-glass-bg text-foreground'
                                    : 'text-foreground-muted hover:text-foreground-muted'
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
                                <div className="text-foreground-muted">Loading chart data...</div>
                            </div>
                        ) : chartData.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-foreground-muted text-sm">No historical data found for this range.</div>
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
                                                 if (timeRange === '1W' || timeRange === '1M') {
                                                     return formatChartDate(val, { day: 'numeric', month: 'short' });
                                                 }
                                                 return formatChartDate(val, { month: 'short', year: '2-digit' });
                                             }}
                                         />
                                        <YAxis stroke="var(--foreground-muted)" fontSize={11} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--line)', borderRadius: '6px' }}
                                             labelStyle={{ color: 'var(--foreground)' }}
                                             itemStyle={{ color: 'var(--foreground)' }}
                                             cursor={{ fill: 'rgba(127,127,127,0.1)' }}
                                             labelFormatter={(val) => formatChartDate(val, { weekday: 'long', month: 'short', day: 'numeric' })}
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
                                                 if (timeRange === '1W' || timeRange === '1M') {
                                                     return formatChartDate(val, { day: 'numeric', month: 'short' });
                                                 }
                                                 return formatChartDate(val, { month: 'short', year: '2-digit' });
                                             }}
                                         />
                                        <YAxis stroke="var(--foreground-muted)" fontSize={11} tickLine={false} domain={['dataMin - 1', 'auto']} />
                                        <Tooltip
                                             contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--line)', borderRadius: '6px' }}
                                             labelStyle={{ color: 'var(--foreground)' }}
                                             itemStyle={{ color: 'var(--foreground)' }}
                                             labelFormatter={(val) => formatChartDate(val, { weekday: 'long', month: 'short', day: 'numeric' })}
                                         />

                                        {/* Raw daily data points */}
                                        <Line
                                            type="monotone"
                                            dataKey="weight"
                                            name="Daily Weight (kg) "
                                            stroke={metricColor}
                                            strokeOpacity={0.3}
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
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
