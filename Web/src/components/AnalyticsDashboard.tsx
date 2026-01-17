'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { predictRaceTime, formatTime, formatPace } from '@/lib/metrics/vdot';
import { Save, Check, BarChart2 } from 'lucide-react';

type AnalyticsDashboardProps = {
    currentVdot: number | null;
    initialThresholdHr?: number;
    initialThresholdPace?: number;
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
    zoneTrend: { date: string; Z1: number; Z2: number; Z3: number; Z4: number; Z5: number; Z6: number; Z7: number }[];
    fitnessTrend: { date: string; ctl: number; atl: number; tsb: number }[];
    vdotTrend: { date: string; vdot: number }[];
    totals: { distance: number; activities: number; averagePace: number };
}

export default function AnalyticsDashboard({ currentVdot, initialThresholdHr, initialThresholdPace }: AnalyticsDashboardProps) {
    const [timeRange, setTimeRange] = useState('12_WEEKS');
    const queryClient = useQueryClient();

    // Calibration State
    const [thresholdHr, setThresholdHr] = useState<string>(initialThresholdHr?.toString() || '');
    const [thresholdPace, setThresholdPace] = useState<string>(initialThresholdPace?.toString() || '');
    const [zones, setZones] = useState<{ min: number; max: number; label: string }[]>([]);

    useEffect(() => {
        if (initialThresholdHr) setThresholdHr(initialThresholdHr.toString());
        if (initialThresholdPace) setThresholdPace(initialThresholdPace.toString());
    }, [initialThresholdHr, initialThresholdPace]);

    // Auto-calculate zones when HR changes
    useEffect(() => {
        const val = parseInt(thresholdHr);
        if (!isNaN(val) && val > 0) {
            setZones([
                { label: 'Zone 1 (Recovery)', min: 0, max: Math.round(val * 0.75) },
                { label: 'Zone 2 (Aerobic)', min: Math.round(val * 0.75) + 1, max: Math.round(val * 0.87) },
                { label: 'Zone 3 (Tempo)', min: Math.round(val * 0.87) + 1, max: Math.round(val * 0.94) },
                { label: 'Zone 4 (Threshold)', min: Math.round(val * 0.94) + 1, max: Math.round(val * 1.00) },
                { label: 'Zone 5 (VO2max)', min: Math.round(val * 1.00) + 1, max: Math.round(val * 1.05) },
                { label: 'Zone 6 (Anaerobic)', min: Math.round(val * 1.05) + 1, max: Math.round(val * 1.10) },
                { label: 'Zone 7 (Neuromuscular)', min: Math.round(val * 1.10) + 1, max: 999 },
            ]);
        } else {
            setZones([]);
        }
    }, [thresholdHr]);

    // Save Profile Mutation
    const saveProfileMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/settings/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    thresholdHeartRate: parseInt(thresholdHr) || null,
                    thresholdPace: parseInt(thresholdPace) || null,
                    // Auto-save calculated maxes as well to keep DB in sync
                    hrZone1Max: zones[0]?.max || undefined,
                    hrZone2Max: zones[1]?.max || undefined,
                    hrZone3Max: zones[2]?.max || undefined,
                    hrZone4Max: zones[3]?.max || undefined,
                    hrZone5Max: zones[4]?.max || undefined,
                    hrZone6Max: zones[5]?.max || undefined,
                })
            });
            if (!res.ok) throw new Error('Failed to save profile');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-profile'] });
        }
    });

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
                                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 60 ? `${Math.round(v / 60)}h` : `${v}m`} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} formatter={(value: number) => {
                                    if (value >= 60) {
                                        const hours = Math.floor(value / 60);
                                        const mins = Math.round(value % 60);
                                        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
                                    }
                                    return `${Math.round(value)}m`;
                                }} />
                                <Area type="monotone" dataKey="Z1" stackId="1" stroke="#10b981" fill="#10b981" name="Z1 Recovery" />
                                <Area type="monotone" dataKey="Z2" stackId="1" stroke="#84cc16" fill="#84cc16" name="Z2 Aerobic" />
                                <Area type="monotone" dataKey="Z3" stackId="1" stroke="#eab308" fill="#eab308" name="Z3 Tempo" />
                                <Area type="monotone" dataKey="Z4" stackId="1" stroke="#f97316" fill="#f97316" name="Z4 Threshold" />
                                <Area type="monotone" dataKey="Z5" stackId="1" stroke="#ef4444" fill="#ef4444" name="Z5 VO2max" />
                                <Area type="monotone" dataKey="Z6" stackId="1" stroke="#6366f1" fill="#6366f1" name="Z6 Anaerobic" />
                                <Area type="monotone" dataKey="Z7" stackId="1" stroke="#9333ea" fill="#9333ea" name="Z7 Neuromuscular" />
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

            {/* Time in Zones Pie Chart */}
            {zoneTrend.length > 0 && (() => {
                // Aggregate zone times from zoneTrend
                const zoneTotals = zoneTrend.reduce((acc, week) => ({
                    Z1: acc.Z1 + (week.Z1 || 0),
                    Z2: acc.Z2 + (week.Z2 || 0),
                    Z3: acc.Z3 + (week.Z3 || 0),
                    Z4: acc.Z4 + (week.Z4 || 0),
                    Z5: acc.Z5 + (week.Z5 || 0),
                    Z6: acc.Z6 + (week.Z6 || 0),
                    Z7: acc.Z7 + (week.Z7 || 0),
                }), { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0, Z6: 0, Z7: 0 });

                const total = zoneTotals.Z1 + zoneTotals.Z2 + zoneTotals.Z3 + zoneTotals.Z4 + zoneTotals.Z5 + zoneTotals.Z6 + zoneTotals.Z7;
                if (total === 0) return null;

                const pieData = [
                    { name: 'Z1 Recovery', value: zoneTotals.Z1, color: '#10b981' },
                    { name: 'Z2 Aerobic', value: zoneTotals.Z2, color: '#84cc16' },
                    { name: 'Z3 Tempo', value: zoneTotals.Z3, color: '#eab308' },
                    { name: 'Z4 Threshold', value: zoneTotals.Z4, color: '#f97316' },
                    { name: 'Z5 VO2max', value: zoneTotals.Z5, color: '#ef4444' },
                    { name: 'Z6 Anaerobic', value: zoneTotals.Z6, color: '#6366f1' },
                    { name: 'Z7 Neuromuscular', value: zoneTotals.Z7, color: '#9333ea' },
                ].filter(d => d.value > 0);

                const formatZoneTime = (minutes: number) => {
                    if (minutes >= 60) {
                        const hours = Math.floor(minutes / 60);
                        const mins = Math.round(minutes % 60);
                        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
                    }
                    return `${Math.round(minutes)}m`;
                };

                return (
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Time in Zones Distribution</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Pie Chart */}
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={90}
                                            paddingAngle={2}
                                            dataKey="value"
                                            label={({ name, percent }) => percent > 0.05 ? `${Math.round(percent * 100)}%` : ''}
                                            labelLine={false}
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                            formatter={(value: number) => formatZoneTime(value)}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Legend & Breakdown */}
                            <div className="flex flex-col justify-center space-y-2">
                                {pieData.map((zone, i) => {
                                    const pct = (zone.value / total) * 100;
                                    return (
                                        <div key={i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: zone.color }} />
                                                <span className="text-gray-300 text-sm">{zone.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-mono text-sm">{formatZoneTime(zone.value)}</span>
                                                <span className="text-gray-500 text-xs w-12 text-right">{Math.round(pct)}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between">
                                    <span className="text-gray-400 text-sm">Total</span>
                                    <span className="text-white font-mono text-sm">{formatZoneTime(total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

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
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} formatter={(value: number) => value.toFixed(1)} />
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
                                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => Math.round(val).toString()} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} formatter={(value: number) => value.toFixed(1)} />
                                <Line type="monotone" dataKey="ctl" stroke="#3b82f6" strokeWidth={2} name="Fitness (CTL)" dot={false} />
                                <Line type="monotone" dataKey="atl" stroke="#ef4444" strokeWidth={2} name="Fatigue (ATL)" dot={false} />
                                <Line type="monotone" dataKey="tsb" stroke="#10b981" strokeWidth={2} name="Form (TSB)" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Calibration Section */}
            <div className="glass-card p-6 border border-white/10">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Performance Calibration</h3>
                        <p className="text-gray-400 text-sm">Fine-tune your zones based on your threshold values.</p>
                    </div>
                    <button
                        onClick={() => saveProfileMutation.mutate()}
                        disabled={saveProfileMutation.isPending}
                        className="btn-primary py-2 px-4 flex items-center gap-2 text-sm"
                    >
                        {saveProfileMutation.isPending ? 'Saving...' : saveProfileMutation.isSuccess ? 'Saved!' : 'Save Calibration'}
                        {saveProfileMutation.isSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Threshold Heart Rate (LTHR)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={thresholdHr}
                                    onChange={(e) => setThresholdHr(e.target.value)}
                                    placeholder="e.g. 170"
                                    className="bg-black/20 border border-white/10 rounded-lg p-3 w-full text-white focus:ring-2 focus:ring-accent-orange outline-none"
                                />
                                <span className="absolute right-3 top-3 text-gray-500 text-sm">bpm</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Your Lactate Threshold Heart Rate. Zone 4 ends here.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Threshold Pace</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={thresholdPace}
                                    onChange={(e) => setThresholdPace(e.target.value)}
                                    placeholder="e.g. 240"
                                    className="bg-black/20 border border-white/10 rounded-lg p-3 w-full text-white focus:ring-2 focus:ring-accent-orange outline-none"
                                />
                                <span className="absolute right-3 top-3 text-gray-500 text-sm">sec/km</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Your functional threshold pace (approx 1h race pace).
                            </p>
                        </div>
                    </div>

                    <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                        <h4 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Calculated Heart Rate Zones</h4>
                        {zones.length > 0 ? (
                            <div className="space-y-2">
                                {zones.map((zone, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm p-2 hover:bg-white/5 rounded">
                                        <span className="text-gray-300 font-medium">{zone.label}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-mono">{zone.min} - {zone.max === 999 ? '+' : zone.max}</span>
                                            <span className="text-gray-500 text-xs">bpm</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2 min-h-[200px]">
                                <BarChart2 className="w-8 h-8 opacity-20" />
                                <p className="text-sm">Enter LTHR to calculate zones</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
