'use client';

import { useQuery } from '@tanstack/react-query';
import { Heart, HeartPulse, Moon, Activity, Zap, RefreshCw, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { getCurrentUtcDayKey, toUtcDayKey } from '@/lib/health/dates';

interface DailyReadiness {
    id: string;
    date: string;
    compositeScore: number;
    state: string;
    confidence: string;
    componentScores: Record<string, number> | null;
    reasons: string[] | null;
    hrvJson?: {
        todayHrv?: number;
        baselineHrv?: number;
        hrvDelta?: number;
        trendDirection?: string;
    } | null;
    computedAt: string | null;
    syncedAt: string | null;
}

interface AdaptedWorkout {
    originalType: string;
    adaptedType: string;
    adaptationType: string;
    originalTargetDuration: number;
    adaptedTargetDuration: number | null;
    originalTargetDistance: number;
    adaptedTargetDistance: number | null;
    reason: string;
}

const STATE_LABELS: Record<string, string> = {
    EXCELLENT: 'Excellent',
    GOOD: 'Good',
    MODERATE: 'Moderate',
    REDUCED: 'Reduced',
    REST: 'Rest',
    UNAVAILABLE: 'Unavailable',
};

function getScoreColor(score: number): string {
    if (score >= 85) return 'text-positive';
    if (score >= 70) return 'text-positive';
    if (score >= 50) return 'text-workout-tempo';
    if (score >= 30) return 'text-workout-tempo';
    return 'text-negative';
}

function getScoreRing(score: number): string {
    if (score >= 85) return 'border-positive/40 bg-positive/5';
    if (score >= 70) return 'border-positive/40 bg-positive/5';
    if (score >= 50) return 'border-workout-tempo/40 bg-workout-tempo/5';
    if (score >= 30) return 'border-workout-tempo/40 bg-workout-tempo/5';
    return 'border-negative/40 bg-negative/5';
}

function getChartStroke(score: number): string {
    if (score >= 85) return 'var(--positive)';
    if (score >= 70) return 'var(--positive)';
    if (score >= 50) return 'var(--workout-tempo)';
    if (score >= 30) return 'var(--workout-tempo)';
    return 'var(--negative)';
}

export default function ReadinessCard() {
    const today = getCurrentUtcDayKey();
    const now = new Date();
    const sixDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6));
    const startKey = toUtcDayKey(sixDaysAgo);

    const { data: daily, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['readiness-daily', today],
        queryFn: async () => {
            const res = await fetch(`/api/health/readiness/daily?date=${today}`);
            if (!res.ok) throw new Error('Failed to fetch readiness');
            return res.json() as Promise<DailyReadiness | null>;
        },
    });

    const { data: history = [] } = useQuery({
        queryKey: ['readiness-history', startKey, today],
        queryFn: async () => {
            const res = await fetch(`/api/health/readiness/history?start=${startKey}&end=${today}`);
            if (!res.ok) throw new Error('Failed to fetch history');
            return res.json() as Promise<DailyReadiness[]>;
        },
    });

    const { data: adaptation } = useQuery({
        queryKey: ['readiness-adaptation', today],
        queryFn: async () => {
            try {
                const res = await fetch(`/api/health/readiness/adaptation?date=${today}`);
                if (res.status === 404) return null;
                if (!res.ok) return null;
                return res.json() as Promise<AdaptedWorkout | null>;
            } catch {
                return null;
            }
        },
        retry: false,
    });

    if (isLoading) {
        return (
            <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-4 h-4 rounded bg-line" />
                    <div className="w-24 h-3 rounded bg-line" />
                </div>
                <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-full bg-background-tertiary" />
                    <div className="flex-1 space-y-2">
                        <div className="w-20 h-4 rounded bg-line" />
                        <div className="w-32 h-3 rounded bg-background-tertiary" />
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                            <div className="w-3.5 h-3.5 rounded bg-line" />
                            <div className="w-8 h-2 rounded bg-background-tertiary" />
                            <div className="w-6 h-3 rounded bg-line" />
                        </div>
                    ))}
                </div>
                <div className="h-16 mt-4 rounded bg-background-tertiary" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="glass-card border-negative/20 bg-negative/5 p-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-negative shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-negative">Readiness unavailable</p>
                        <p className="text-xs text-foreground-muted mt-1">{(error as Error)?.message || 'Failed to load readiness data.'}</p>
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="mt-3 text-xs font-semibold text-negative bg-negative/10 border border-negative/20 px-3 py-1.5 rounded-md hover:bg-negative/20 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!daily) {
        return (
            <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-3">
                    <Heart className="w-4 h-4 text-accent-pink" />
                    <h4 className="text-xs font-semibold text-foreground-muted">Readiness</h4>
                </div>
                <p className="text-sm text-foreground-muted text-center py-6">No readiness data yet</p>
                <p className="text-xs text-foreground-secondary text-center">Complete a workout or sync health data to see your readiness score.</p>
            </div>
        );
    }

    const score = daily.compositeScore;
    const components = (daily.componentScores || {}) as Record<string, number>;
    const hrrScore = components['hrr'] ?? components['HRR'] ?? null;
    const sleepScore = components['sleep'] ?? components['SLEEP'] ?? null;
    const loadScore = components['load'] ?? components['LOAD'] ?? null;
    const feelScore = components['subjective'] ?? components['SUBJECTIVE'] ?? null;
    const todayHrv = daily.hrvJson?.todayHrv ?? null;

    const chartData = history.map((r) => ({
        date: r.date.slice(5),
        score: r.compositeScore,
    }));

    const chartColor = getChartStroke(score);

    return (
        <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-accent-pink" />
                    <h4 className="text-xs font-semibold text-foreground-muted">Readiness</h4>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-background-tertiary text-foreground-muted font-medium capitalize">
                        {daily.confidence}
                    </span>
                    {daily.syncedAt && (
                        <span className="text-[10px] font-mono text-foreground-secondary">
                            Synced {new Date(daily.syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-5 mb-4">
                <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center ${getScoreRing(score)}`}>
                    <span className={`text-2xl font-semibold font-mono tabular-nums ${getScoreColor(score)}`}>{Math.round(score)}</span>
                </div>
                <div>
                    <p className={`text-lg font-semibold ${getScoreColor(score)}`}>
                        {STATE_LABELS[daily.state] || daily.state}
                    </p>
                    {daily.reasons && Array.isArray(daily.reasons) && daily.reasons.length > 0 && (
                        <p className="text-xs text-foreground-muted mt-1 leading-relaxed">{daily.reasons[0]}</p>
                    )}
                </div>
            </div>

            <div className={`grid ${todayHrv !== null ? 'grid-cols-5' : 'grid-cols-4'} gap-2 mb-4`}>
                <ComponentIndicator icon={<Activity className="w-3.5 h-3.5" />} label="HRR" value={hrrScore} color="text-positive" />
                <ComponentIndicator icon={<Moon className="w-3.5 h-3.5" />} label="Sleep" value={sleepScore} color="text-workout-long-run" />
                <ComponentIndicator icon={<Zap className="w-3.5 h-3.5" />} label="Load" value={loadScore} color="text-workout-tempo" />
                <ComponentIndicator icon={<Heart className="w-3.5 h-3.5" />} label="Feel" value={feelScore} color="text-accent-pink" />
                {todayHrv !== null && (
                    <div className="flex flex-col items-center gap-1">
                        <div className="text-foreground-secondary"><HeartPulse className="w-3.5 h-3.5" /></div>
                        <span className="text-[10px] text-foreground-muted">HRV</span>
                        <span className="text-sm font-semibold font-mono tabular-nums text-foreground">{Math.round(todayHrv)} ms</span>
                    </div>
                )}
            </div>

            {chartData.length > 1 && (
                <div className="h-16 mb-3">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <Area
                                type="monotone"
                                dataKey="score"
                                stroke={chartColor}
                                strokeWidth={2}
                                fill={chartColor}
                                fillOpacity={0.12}
                                dot={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {adaptation && (
                <div className="border border-line rounded-md p-3 bg-background-tertiary mb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <RefreshCw className="w-3.5 h-3.5 text-accent-blue" />
                        <span className="text-xs font-semibold text-accent-blue">Adaptation</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-foreground-muted">
                        <span className="capitalize">{adaptation.originalType.replace(/_/g, ' ')}</span>
                        <span className="text-foreground-secondary">&rarr;</span>
                        <span className="capitalize text-foreground font-medium">{adaptation.adaptedType.replace(/_/g, ' ')}</span>
                    </div>
                    {adaptation.adaptedTargetDuration != null && adaptation.originalTargetDuration > 0 && (
                        <p className="text-[11px] text-foreground-muted mt-1">
                            {adaptation.originalTargetDuration}min &rarr; {adaptation.adaptedTargetDuration}min
                        </p>
                    )}
                    {adaptation.reason && (
                        <p className="text-[11px] text-foreground-muted mt-1">{adaptation.reason}</p>
                    )}
                </div>
            )}
        </div>
    );
}

function ComponentIndicator({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | null; color: string }) {
    return (
        <div className="flex flex-col items-center gap-1">
            <div className={color}>{icon}</div>
            <span className="text-[10px] text-foreground-muted">{label}</span>
            <span className="text-sm font-semibold font-mono tabular-nums text-foreground">{value !== null ? Math.round(value) : '\u2014'}</span>
        </div>
    );
}
