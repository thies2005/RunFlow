'use client';

import { HeartPulse, Gauge, BatteryCharging, Activity, ClipboardList } from 'lucide-react';
import { fmtKm } from './metrics';

interface SummaryStatsProps {
    /** either the visible weeks (week mode) or the month entry (month mode) */
    period: { trimp: number; tss: number; plannedTss: number; distance: number; avgVdot: number | null };
    /** CTL/ATL/TSB for the *last* week in the visible range (most recent form) */
    fitness?: { ctl: number; atl: number; tsb: number };
}

export function SummaryStats({ period, fitness }: SummaryStatsProps) {
    const cards = [
        {
            label: 'Period TRIMP',
            value: period.trimp.toFixed(0),
            sub: `TSS ${period.tss.toFixed(0)}`,
            icon: Activity,
            color: 'text-red-400',
            bg: 'bg-red-500/10',
        },
        {
            label: 'Planned TSS',
            value: period.plannedTss.toFixed(0),
            sub: 'scheduled load',
            icon: ClipboardList,
            color: 'text-foreground-secondary',
            bg: 'bg-foreground/10',
        },
        {
            label: 'Avg VO₂max',
            value: period.avgVdot != null ? period.avgVdot.toFixed(1) : '—',
            sub: 'effective',
            icon: Gauge,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
        },
        {
            label: 'Distance',
            value: fmtKm(period.distance),
            sub: 'total',
            icon: Activity,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
        },
        {
            label: 'Fitness (CTL)',
            value: fitness ? fitness.ctl.toFixed(0) : '—',
            sub: '42-day load',
            icon: HeartPulse,
            color: 'text-green-400',
            bg: 'bg-green-500/10',
        },
        {
            label: 'Fatigue (ATL)',
            value: fitness ? fitness.atl.toFixed(0) : '—',
            sub: '7-day load',
            icon: BatteryCharging,
            color: 'text-orange-400',
            bg: 'bg-orange-500/10',
        },
        {
            label: 'Form (TSB)',
            value: fitness ? `${fitness.tsb >= 0 ? '+' : ''}${fitness.tsb.toFixed(0)}` : '—',
            sub: fitness ? (fitness.tsb >= 0 ? 'fresh' : 'fatigued') : 'CTL − ATL',
            icon: Activity,
            color: fitness && fitness.tsb >= 0 ? 'text-green-400' : 'text-red-400',
            bg: fitness && fitness.tsb >= 0 ? 'bg-green-500/10' : 'bg-red-500/10',
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 px-4 py-3 border-b border-glass-border bg-background-secondary/40 shrink-0">
            {cards.map((c) => (
                <div key={c.label} className="rounded-lg bg-background-secondary border border-glass-border p-2.5 flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${c.bg}`}>
                        <c.icon className={`w-4 h-4 ${c.color}`} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] text-foreground-muted uppercase tracking-wide truncate">{c.label}</div>
                        <div className={`text-base font-semibold leading-none ${c.color}`}>{c.value}</div>
                        <div className="text-[10px] text-foreground-muted mt-0.5 truncate">{c.sub}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
