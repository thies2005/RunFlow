'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, LineChart, Line
} from 'recharts';
import { predictRaceTime, formatTime, formatPace } from '@/lib/metrics/vdot';

type AnalyticsDashboardProps = {
    currentVdot: number | null;
};

const RANGES = [
    { label: 'Last 4 Weeks', value: '4_WEEKS' },
    { label: 'Last 12 Weeks', value: '12_WEEKS' },
    { label: 'Last 6 Months', value: '6_MONTHS' },
    { label: 'Last Year', value: '1_YEAR' },
    { label: 'All Time', value: 'ALL' },
];

interface HistoryResponse {
    weeklyVolume: { date: string; km: number }[];
    zoneTrend: { date: string; Z1: number; Z2: number; Z3: number; Z4: number; Z5: number }[];
    fitnessTrend: { date: string; ctl: number; atl: number; tsb: number }[];
    vdotTrend: { date: string; vdot: number }[];
    totals: { distance: number; activities: number; averagePace: number };
}

export default function AnalyticsDashboard({ currentVdot }: AnalyticsDashboardProps) {
    const [timeRange, setTimeRange] = useState('12_WEEKS');

    // Fetch Aggregated History
    const { data, isLoading } = useQuery<HistoryResponse>({
        queryKey: ['analytics-history', timeRange],
        queryFn: async () => {
            const res = await fetch(`/api/analytics/history?range=${timeRange}`);
            if (!res.ok) throw new Error('Failed to fetch analytics');
            return res.json();
        }
    });

    if (isLoading) {
        return <div className="animate-pulse h-96 bg-gray-800/50 rounded-xl"></div>;
    }

    if (!data) return null;

    const { weeklyVolume, zoneTrend, fitnessTrend, vdotTrend, totals } = data;

    // Race Predictions based on current VDOT
    const racePredictions = currentVdot && currentVdot > 0 ? [
        { race: '5K', time: formatTime(predictRaceTime(currentVdot, '5K')) },
        { race: '10K', time: formatTime(predictRaceTime(currentVdot, '10K')) },
        { race: 'Half', time: formatTime(predictRaceTime(currentVdot, 'HALF')) },
        { race: 'Marathon', time: formatTime(predictRaceTime(currentVdot, 'MARATHON')) },
    ] : [];

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    {RANGES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Zone Distribution Trend */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Training Zone Trend</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={zoneTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} unit="min" />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} formatter={(value: number) => value + ' min'} />
                                <Area type="monotone" dataKey="Z1" stackId="1" stroke="#10b981" fill="#10b981" name="Z1 Recovery" />
                                <Area type="monotone" dataKey="Z2" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Z2 Aerobic" />
                                <Area type="monotone" dataKey="Z3" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Z3 Tempo" />
                                <Area type="monotone" dataKey="Z4" stackId="1" stroke="#ef4444" fill="#ef4444" name="Z4 Threshold" />
                                <Area type="monotone" dataKey="Z5" stackId="1" stroke="#7f1d1d" fill="#7f1d1d" name="Z5 VO2max" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Weekly Volume */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Weekly Volume</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyVolume}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} unit="km" />
                                <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                <Bar dataKey="km" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 text-center">
                    <p className="text-gray-400 text-sm mb-1">Current VDOT</p>
                    <p className="text-3xl font-bold text-white">{currentVdot?.toFixed(1) || '-'}</p>
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="text-gray-400 text-sm mb-1">Total Distance</p>
                    <p className="text-3xl font-bold text-white">
                        {totals?.distance || 0}<span className="text-sm text-gray-500 font-normal ml-1">km</span>
                    </p>
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="text-gray-400 text-sm mb-1">Total Activities</p>
                    <p className="text-3xl font-bold text-white">{totals?.activities || 0}</p>
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="text-gray-400 text-sm mb-1">Avg Pace</p>
                    <p className="text-3xl font-bold text-white">
                        {totals?.averagePace ? formatPace(totals.averagePace).replace('/km', '') : '-'}
                    </p>
                </div>
            </div>

            {/* VDOT Trend */}
            {vdotTrend.length > 0 && (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">VDOT Trend</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={vdotTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                <Line type="monotone" dataKey="vdot" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Race Predictions */}
            {racePredictions.length > 0 && (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Race Predictions (VDOT {currentVdot?.toFixed(1)})</h3>
                    <div className="grid grid-cols-4 gap-4">
                        {racePredictions.map(p => (
                            <div key={p.race} className="text-center">
                                <p className="text-gray-400 text-sm">{p.race}</p>
                                <p className="text-2xl font-bold text-white">{p.time}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Fitness Chart */}
            {fitnessTrend.length > 0 && (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Fitness Tracking (Impulse-Response)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={fitnessTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                <Line type="monotone" dataKey="ctl" stroke="#10b981" strokeWidth={2} name="Fitness (CTL)" dot={false} />
                                <Line type="monotone" dataKey="atl" stroke="#ef4444" strokeWidth={2} name="Fatigue (ATL)" dot={false} />
                                <Line type="monotone" dataKey="tsb" stroke="#3b82f6" strokeWidth={2} name="Form (TSB)" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}
