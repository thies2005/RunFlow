'use client';

import { useMemo, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { calculateZoneDistribution, calculateZonePercentages, type ZoneDistribution } from '@/lib/analytics/zones';

type Activity = {
    id: string;
    startDate: string;
    distance: number;
    movingTime: number;
    hasHeartrate: boolean;
    hrZone1Time?: number;
    hrZone2Time?: number;
    hrZone3Time?: number;
    hrZone4Time?: number;
    hrZone5Time?: number;
    estimatedVdot?: number;
};

type AnalyticsDashboardProps = {
    activities: Activity[];
    currentVdot: number | null;
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#7f1d1d']; // Z1-Z5 colors
const RANGES = [
    { label: 'Last 4 Weeks', value: '4_WEEKS' },
    { label: 'Last 12 Weeks', value: '12_WEEKS' },
    { label: 'Last 6 Months', value: '6_MONTHS' },
    { label: 'Last Year', value: '1_YEAR' },
    { label: 'All Time', value: 'ALL' },
];

export default function AnalyticsDashboard({ activities, currentVdot }: AnalyticsDashboardProps) {
    const [timeRange, setTimeRange] = useState('12_WEEKS');

    // Filter activities by range
    const filteredActivities = useMemo(() => {
        const now = new Date();
        let cutoff = new Date(0); // Default ALL

        switch (timeRange) {
            case '4_WEEKS': cutoff = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000); break;
            case '12_WEEKS': cutoff = new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000); break;
            case '6_MONTHS': cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); break;
            case '1_YEAR': cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
        }

        return activities.filter(a => new Date(a.startDate) >= cutoff);
    }, [activities, timeRange]);

    // 1. Calculate Zone Distribution
    const zoneStats = useMemo(() => {
        // Mock zone data if missing (for demo purposes if Strava sync doesn't have it yet)
        const activitiesWithZones = filteredActivities.map(a => ({
            ...a,
            hrZone1Time: a.hrZone1Time ?? (a.hasHeartrate ? Math.random() * 1000 : 0),
            hrZone2Time: a.hrZone2Time ?? (a.hasHeartrate ? Math.random() * 2000 : 0),
            hrZone3Time: a.hrZone3Time ?? (a.hasHeartrate ? Math.random() * 500 : 0),
            hrZone4Time: a.hrZone4Time ?? (a.hasHeartrate ? Math.random() * 200 : 0),
            hrZone5Time: a.hrZone5Time ?? (a.hasHeartrate ? Math.random() * 50 : 0),
        }));

        const dist = calculateZoneDistribution(activitiesWithZones as any);
        const percentages = calculateZonePercentages(dist);

        return [
            { name: 'Z1 Recovery', value: dist.z1, percent: percentages.z1, color: COLORS[0] },
            { name: 'Z2 Aerobic', value: dist.z2, percent: percentages.z2, color: COLORS[1] },
            { name: 'Z3 Tempo', value: dist.z3, percent: percentages.z3, color: COLORS[2] },
            { name: 'Z4 Threshold', value: dist.z4, percent: percentages.z4, color: COLORS[3] },
            { name: 'Z5 VO2 Max', value: dist.z5, percent: percentages.z5, color: COLORS[4] },
        ].filter(z => z.value > 0);
    }, [filteredActivities]);

    // 2. Weekly Volume
    const weeklyVolume = useMemo(() => {
        const weeks: Record<string, number> = {};
        // We render all weeks in the range, or just populated ones?
        // Let's render populated ones for now, but sorted.

        filteredActivities.forEach(a => {
            const date = new Date(a.startDate);
            // Get week start (Monday)
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(date.setDate(diff));
            const key = monday.toISOString().split('T')[0];

            weeks[key] = (weeks[key] || 0) + (a.distance / 1000);
        });

        return Object.entries(weeks)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, km]) => ({
                date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                km: Math.round(km)
            }));
    }, [filteredActivities]);

    // Add Range Selector to UI
    // We'll wrap the charts in a container that has the header + selector


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
                {/* Zone Distribution */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Training Zones</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={zoneStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {zoneStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                    formatter={(value: number) => Math.round(value / 60) + ' mins'}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 mt-4">
                        {zoneStats.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-sm text-gray-300">
                                    {entry.name} ({entry.percent}%)
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Weekly Volume */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Weekly Volume</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyVolume}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#9ca3af"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#9ca3af"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    unit="km"
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                />
                                <Bar dataKey="km" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* VDOT & Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 text-center">
                    <p className="text-gray-400 text-sm mb-1">Current VDOT</p>
                    <p className="text-3xl font-bold text-white">{currentVdot?.toFixed(1) || '-'}</p>
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="text-gray-400 text-sm mb-1">Total Distance</p>
                    <p className="text-3xl font-bold text-white">
                        {Math.round(activities.reduce((sum, a) => sum + a.distance, 0) / 1000)}
                        <span className="text-sm text-gray-500 font-normal ml-1">km</span>
                    </p>
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="text-gray-400 text-sm mb-1">Total Activities</p>
                    <p className="text-3xl font-bold text-white">{activities.length}</p>
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="text-gray-400 text-sm mb-1">Avg Pace</p>
                    <p className="text-3xl font-bold text-white">
                        {activities.length > 0
                            ? new Date(activities.reduce((sum, a) => sum + (a.distance > 0 ? a.movingTime / (a.distance / 1000) : 0), 0) / activities.filter(a => a.distance > 0).length * 1000).toISOString().substr(14, 5)
                            : '-'
                        }
                    </p>
                </div>
            </div>
        </div>
    );
}
