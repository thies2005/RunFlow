'use client';

import { useMemo, useCallback } from 'react';
import { Activity } from '@/lib/types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, MapPin, Clock, Zap, Heart, Mountain } from 'lucide-react';
import Link from 'next/link';
import InteractiveStreamsChart from '@/components/InteractiveStreamsChart';

interface ClientAnalysisProps {
    activity: Activity;
}

export default function ClientAnalysis({ activity }: ClientAnalysisProps) {
    const streams = activity.streams as any;

    // Memoize chart data transformation to avoid recalculation on re-render
    const chartData = useMemo(() => {
        if (!streams?.time) return [];

        return streams.time.map((t: number, i: number) => {
            // Determine max pace based on activity type
            const trainingType = activity.trainingType || 'RUN';
            // 10 min/km for running, 15 min/km for others (like hiking/walking)
            const maxPace = (trainingType === 'RUN' || trainingType === 'EASY' || trainingType.includes('RUN')) ? 10 : 15;

            return {
                time: t,
                distance: streams.distance ? streams.distance[i] : 0,
                hr: streams.heartrate ? streams.heartrate[i] : null,
                pace: (streams.velocity_smooth && streams.velocity_smooth[i] > 0.5)
                    ? Math.min(maxPace, (1000 / streams.velocity_smooth[i]) / 60)
                    : null,
                altitude: streams.altitude ? streams.altitude[i] : null,
                cadence: streams.cadence ? streams.cadence[i] * 2 : null,
            };
        }).filter((d: any) => d.hr !== null || d.pace !== null);
    }, [streams, activity.trainingType]);

    // Memoize formatXAxis to avoid recreating on every render
    const formatXAxis = useCallback((tickItem: number) => {
        const mins = Math.floor(tickItem / 60);
        return `${mins}m`;
    }, []);

    const avgHr = activity.averageHr || 0;

    return (
        <div className="min-h-screen bg-background text-foreground p-6">
            {/* Header */}
            <div className="mb-8 flex items-center gap-4">
                <Link href="/" className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">{activity.name}</h1>
                    <div className="flex items-center gap-2 text-foreground-muted text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(activity.startDate), 'PPP p')}</span>
                        <span className="px-2 py-0.5 rounded-full bg-accent-purple/20 text-accent-purple text-xs border border-accent-purple/50">
                            {activity.trainingType?.replace('_', ' ') || 'RUN'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                <div className="glass-card p-4">
                    <div className="flex items-center gap-2 text-foreground-muted text-xs uppercase mb-1">
                        <MapPin className="w-3 h-3" /> Distance
                    </div>
                    <div className="text-2xl font-bold">{(activity.distance / 1000).toFixed(2)} <span className="text-sm font-normal text-foreground-muted">km</span></div>
                </div>
                <div className="glass-card p-4">
                    <div className="flex items-center gap-2 text-foreground-muted text-xs uppercase mb-1">
                        <Clock className="w-3 h-3" /> Duration
                    </div>
                    <div className="text-2xl font-bold">{(activity.movingTime / 60).toFixed(0)} <span className="text-sm font-normal text-foreground-muted">min</span></div>
                </div>
                <div className="glass-card p-4">
                    <div className="flex items-center gap-2 text-foreground-muted text-xs uppercase mb-1">
                        <Zap className="w-3 h-3" /> Avg Pace
                    </div>
                    <div className="text-2xl font-bold">
                        {activity.averageSpeed ? Math.floor(16.6667 / activity.averageSpeed) + ':' + Math.round((16.6667 / activity.averageSpeed % 1) * 60).toString().padStart(2, '0') : '-'}
                        <span className="text-sm font-normal text-foreground-muted"> /km</span>
                    </div>
                </div>
                <div className="glass-card p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-foreground-muted text-xs uppercase mb-1">
                        <Heart className="w-3 h-3" /> Avg HR
                    </div>
                    <div className="text-2xl font-bold">{Math.round(avgHr)} <span className="text-sm font-normal text-foreground-muted">bpm</span></div>
                </div>
                <div className="glass-card p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-foreground-muted text-xs uppercase mb-1">
                        <Zap className="w-3 h-3" /> Avg Cadence
                    </div>
                    <div className="text-2xl font-bold">{activity.averageCadence ? Math.round(activity.averageCadence) : '-'} <span className="text-sm font-normal text-foreground-muted">spm</span></div>
                </div>
            </div>

            {/* Combined Interactive Chart */}
            <div className="glass-card p-6 mb-8">
                <h3 className="text-lg font-semibold mb-4">Detailed Analysis</h3>
                <InteractiveStreamsChart streams={streams} />
            </div>

            {/* Graphs */}
            <div className="space-y-6">
                {/* Heart Rate Graph */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-red-500" /> Heart Rate
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" tickFormatter={formatXAxis} stroke="#6b7280" />
                                <YAxis domain={['auto', 'auto']} stroke="#6b7280" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--glass-bg)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '8px',
                                        backdropFilter: 'blur(12px)',
                                        color: 'var(--foreground)'
                                    }}
                                    itemStyle={{ color: 'var(--foreground)' }}
                                    labelStyle={{ color: 'var(--foreground-muted)' }}
                                    labelFormatter={(label) => formatXAxis(label as number)}
                                />
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <Area type="monotone" dataKey="hr" stroke="#ef4444" fillOpacity={1} fill="url(#colorHr)" unit=" bpm" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pace Graph */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-500" /> Pace (min/km)
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPace" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" tickFormatter={formatXAxis} stroke="#6b7280" />
                                <YAxis domain={['dataMax', 'dataMin']} stroke="#6b7280" ticks={[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--glass-bg)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '8px',
                                        backdropFilter: 'blur(12px)',
                                        color: 'var(--foreground)'
                                    }}
                                    itemStyle={{ color: 'var(--foreground)' }}
                                    labelStyle={{ color: 'var(--foreground-muted)' }}
                                    labelFormatter={(label) => formatXAxis(label as number)}
                                    formatter={(value: number) => {
                                        const mins = Math.floor(value);
                                        const secs = Math.round((value % 1) * 60).toString().padStart(2, '0');
                                        return [`${mins}:${secs}`, 'Pace'];
                                    }}
                                />
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <Area type="monotone" dataKey="pace" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPace)" connectNulls />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Altitude Graph */}
                {chartData.some((d: any) => d.altitude) && (
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Mountain className="w-4 h-4 text-foreground-muted" /> Elevation
                        </h3>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorAlt" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" tickFormatter={formatXAxis} stroke="#6b7280" />
                                    <YAxis domain={['auto', 'auto']} stroke="#6b7280" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--glass-bg)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '8px',
                                            backdropFilter: 'blur(12px)',
                                            color: 'var(--foreground)'
                                        }}
                                        itemStyle={{ color: 'var(--foreground)' }}
                                        labelStyle={{ color: 'var(--foreground-muted)' }}
                                        labelFormatter={(label) => formatXAxis(label as number)}
                                    />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <Area type="monotone" dataKey="altitude" stroke="#9ca3af" fillOpacity={1} fill="url(#colorAlt)" unit=" m" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Cadence Graph */}
                {chartData.some((d: any) => d.cadence) && (
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-accent-purple" /> Cadence (spm)
                        </h3>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" tickFormatter={formatXAxis} stroke="#6b7280" />
                                    <YAxis domain={['auto', 'auto']} stroke="#6b7280" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--glass-bg)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '8px',
                                            backdropFilter: 'blur(12px)',
                                            color: 'var(--foreground)'
                                        }}
                                        itemStyle={{ color: 'var(--foreground)' }}
                                        labelStyle={{ color: 'var(--foreground-muted)' }}
                                        labelFormatter={(label) => formatXAxis(label as number)}
                                    />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <Area type="monotone" dataKey="cadence" stroke="#a855f7" fillOpacity={1} fill="url(#colorCad)" connectNulls />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
