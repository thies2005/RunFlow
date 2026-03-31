'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { Activity } from '@/lib/types';

interface ZoneDistributionSectionProps {
    activities: Activity[];
    userData: any;
}

export default function ZoneDistributionSection({ activities, userData }: ZoneDistributionSectionProps) {
    const [zonesTimeRange, setZonesTimeRange] = useState<'1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL'>('1Y');

    const now = new Date();
    const cutoff = new Date();
    switch (zonesTimeRange) {
        case '1Y': cutoff.setFullYear(now.getFullYear() - 1); break;
        case '6M': cutoff.setMonth(now.getMonth() - 6); break;
        case '3M': cutoff.setMonth(now.getMonth() - 3); break;
        case '1M': cutoff.setMonth(now.getMonth() - 1); break;
        case '1W': cutoff.setDate(now.getDate() - 7); break;
        default: cutoff.setTime(0); // ALL
    }

    const filteredActivities = zonesTimeRange === 'ALL'
        ? activities
        : activities.filter(a => new Date(a.startDate) >= cutoff);

    // Aggregate zone times
    const zoneTotals = filteredActivities.reduce((acc, activity) => ({
        Z1: acc.Z1 + (activity.hrZone1Time || 0),
        Z2: acc.Z2 + (activity.hrZone2Time || 0),
        Z3: acc.Z3 + (activity.hrZone3Time || 0),
        Z4: acc.Z4 + (activity.hrZone4Time || 0),
        Z5: acc.Z5 + (activity.hrZone5Time || 0),
        Z6: acc.Z6 + (activity.hrZone6Time || 0),
        Z7: acc.Z7 + (activity.hrZone7Time || 0),
    }), { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0, Z6: 0, Z7: 0 });

    const total = Object.values(zoneTotals).reduce((sum, v) => sum + v, 0);
    if (total === 0) return null;

    // Get HR zone thresholds from userData
    const z1Max = userData?.hrZone1Max || 130;
    const z2Max = userData?.hrZone2Max || 148;
    const z3Max = userData?.hrZone3Max || 160;
    const z4Max = userData?.hrZone4Max || 170;
    const z5Max = userData?.hrZone5Max || 178;
    const z6Max = userData?.hrZone6Max || 187;

    const pieData = [
        { name: 'Z1 Recovery', value: zoneTotals.Z1, color: '#10b981', hrRange: `<${z1Max}` },
        { name: 'Z2 Aerobic', value: zoneTotals.Z2, color: '#84cc16', hrRange: `${z1Max}-${z2Max}` },
        { name: 'Z3 Tempo', value: zoneTotals.Z3, color: '#eab308', hrRange: `${z2Max}-${z3Max}` },
        { name: 'Z4 Threshold', value: zoneTotals.Z4, color: '#f97316', hrRange: `${z3Max}-${z4Max}` },
        { name: 'Z5 VO2max', value: zoneTotals.Z5, color: '#ef4444', hrRange: `${z4Max}-${z5Max}` },
        { name: 'Z6 Anaerobic', value: zoneTotals.Z6, color: '#6366f1', hrRange: `${z5Max}-${z6Max}` },
        { name: 'Z7 Neuromuscular', value: zoneTotals.Z7, color: '#9333ea', hrRange: `>${z6Max}` },
    ].filter(d => d.value > 0);

    const formatZoneTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
        return `${mins}m`;
    };

    const zonesRanges: ('1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL')[] = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];

    return (
        <div className="glass-card p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-foreground">Time in Zones Distribution</h3>
                <div className="flex bg-background-secondary rounded-lg p-1 border border-glass-border">
                    {zonesRanges.map(range => (
                        <button
                            key={range}
                            onClick={() => setZonesTimeRange(range)}
                            className={`px-2 py-1 text-xs font-medium rounded transition-all ${zonesTimeRange === range
                                ? 'bg-zinc-700 text-white shadow-xs'
                                : 'text-foreground-muted hover:text-foreground'
                                }`}
                            style={zonesTimeRange === range ? { backgroundColor: 'var(--accent-purple)' } : {}}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-64 min-h-[256px] w-full relative">
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
                                isAnimationActive={false}
                                label={({ percent }) => percent > 0.05 ? `${Math.round(percent * 100)}%` : ''}
                                labelLine={false}
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                                formatter={(value: number) => formatZoneTime(value)}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex flex-col justify-center space-y-2">
                    {pieData.map((zone, i) => {
                        const pct = (zone.value / total) * 100;
                        return (
                            <div key={i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-xs" style={{ backgroundColor: zone.color }} />
                                    <span className="text-foreground-muted text-sm">{zone.name}</span>
                                    <span className="text-foreground-muted text-[10px] opacity-60">({zone.hrRange} bpm)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-foreground font-mono text-sm">{formatZoneTime(zone.value)}</span>
                                    <span className="text-foreground-muted text-xs w-12 text-right">{Math.round(pct)}%</span>
                                </div>
                            </div>
                        );
                    })}
                    <div className="border-t border-glass-border pt-2 mt-2 flex justify-between">
                        <span className="text-foreground-muted text-sm">Total</span>
                        <span className="text-foreground font-mono text-sm">{formatZoneTime(total)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
