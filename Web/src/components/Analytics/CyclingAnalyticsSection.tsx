'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Zap,
    TrendingUp,
    Heart,
    Clock,
    Activity as ActivityIcon,
    Edit2,
    Check,
    X,
    Sparkles,
    ShieldCheck,
    AlertCircle,
    Info,
    Calendar,
    ChevronRight,
    Loader2
} from 'lucide-react';
import {
    ResponsiveContainer,
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ReferenceLine
} from 'recharts';
import { format } from 'date-fns';
import PowerDurationCurveChart from './PowerDurationCurveChart';
import SplitPmcChart, { type PmcRange } from './SplitPmcChart';

export interface CyclingAnalyticsSectionProps {
    initialRange?: PmcRange;
}

interface CyclingApiResponse {
    ftp: {
        ftpWatts: number | null;
        eFtpWatts: number | null;
        cyclingVo2max?: number | null;
        autoEstimateFtp: boolean;
        weightKg: number | null;
        wPerKg: number | null;
        zones: Array<{
            zone: number;
            name: string;
            minWatts: number;
            maxWatts: number;
            minWkg: number | null;
            maxWkg: number | null;
        }>;
    };
    summary: {
        totalRides: number;
        totalDistanceM: number;
        totalMovingTimeSec: number;
        totalElevationM: number;
        totalKilojoules: number;
        avgWatts: number | null;
        maxWatts: number | null;
        avgNpWatts: number | null;
        avgIf: number | null;
        avgVi: number | null;
        totalBikeTss: number;
        avgEfficiencyFactor: number | null;
        avgDecouplingPct: number | null;
    };
    powerCurve: {
        durationsSec: number[];
        peakWatts: number[];
        peakWkg: (number | null)[];
        allTimePeakWatts: number[];
    };
    zoneDistributionSec: number[];
    ridesSeries: Array<{
        id: string;
        date: string;
        name: string;
        distanceM: number;
        movingTimeSec: number;
        avgWatts: number | null;
        npWatts: number | null;
        maxWatts: number | null;
        if: number | null;
        vi: number | null;
        bikeTss: number | null;
        ef: number | null;
        decouplingPct: number | null;
        deviceWatts: boolean;
    }>;
    pmcSeries: Array<{
        date: string;
        ctlCombined: number;
        atlCombined: number;
        tsbCombined: number;
        ctlRunning: number;
        atlRunning: number;
        tsbRunning: number;
        ctlBike: number;
        atlBike: number;
        tsbBike: number;
        runTss: number;
        bikeTss: number;
        trimp: number;
    }>;
}

const ZONE_COLORS = [
    { bg: 'bg-emerald-500', text: 'text-emerald-500', hex: '#10b981', label: 'Z1 Active Recovery', pct: '< 55%' },
    { bg: 'bg-blue-500', text: 'text-blue-500', hex: '#3b82f6', label: 'Z2 Endurance', pct: '56 - 75%' },
    { bg: 'bg-cyan-500', text: 'text-cyan-500', hex: '#06b6d4', label: 'Z3 Tempo', pct: '76 - 90%' },
    { bg: 'bg-amber-500', text: 'text-amber-500', hex: '#f59e0b', label: 'Z4 Sweet Spot / Threshold', pct: '91 - 105%' },
    { bg: 'bg-orange-500', text: 'text-orange-500', hex: '#f97316', label: 'Z5 VO2max', pct: '106 - 120%' },
    { bg: 'bg-purple-500', text: 'text-purple-500', hex: '#a855f7', label: 'Z6 Anaerobic', pct: '121 - 150%' },
    { bg: 'bg-rose-500', text: 'text-rose-500', hex: '#f43f5e', label: 'Z7 Neuromuscular', pct: '> 150%' },
];

function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

export default function CyclingAnalyticsSection({
    initialRange = '90d',
}: CyclingAnalyticsSectionProps) {
    const queryClient = useQueryClient();
    const [range, setRange] = useState<PmcRange>(initialRange);
    const [isFtpModalOpen, setIsFtpModalOpen] = useState(false);
    const [inputFtp, setInputFtp] = useState<string>('');
    const [autoEstimate, setAutoEstimate] = useState<boolean>(true);
    const [editError, setEditError] = useState<string | null>(null);

    // Fetch cycling analytics
    const { data, isLoading, error } = useQuery<CyclingApiResponse>({
        queryKey: ['cycling-analytics', range],
        queryFn: async () => {
            const res = await fetch(`/api/analytics/cycling?range=${range}`);
            if (!res.ok) throw new Error('Failed to fetch cycling analytics');
            return res.json();
        },
    });

    // FTP update mutation
    const ftpMutation = useMutation({
        mutationFn: async ({ ftpWatts, autoEstimateFtp }: { ftpWatts: number | null; autoEstimateFtp: boolean }) => {
            const res = await fetch('/api/settings/cycling', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ftpWatts, autoEstimateFtp }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => null);
                throw new Error(err?.error || 'Failed to update FTP');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cycling-analytics'] });
            queryClient.invalidateQueries({ queryKey: ['user-settings'] });
            setIsFtpModalOpen(false);
            setEditError(null);
        },
        onError: (err: any) => {
            setEditError(err.message || 'Failed to save FTP settings');
        },
    });

    const openEditModal = () => {
        setInputFtp(data?.ftp.ftpWatts ? String(data.ftp.ftpWatts) : '');
        setAutoEstimate(data?.ftp.autoEstimateFtp ?? true);
        setEditError(null);
        setIsFtpModalOpen(true);
    };

    const handleSaveFtp = (e: React.FormEvent) => {
        e.preventDefault();
        const val = inputFtp.trim();
        const num = val === '' ? null : Number(val);
        if (num !== null && (isNaN(num) || num < 30 || num > 800)) {
            setEditError('FTP must be between 30 and 800 Watts');
            return;
        }
        ftpMutation.mutate({ ftpWatts: num, autoEstimateFtp: autoEstimate });
    };

    // Calculate recent 4-week totals
    const fourWeekStats = useMemo(() => {
        if (!data?.ridesSeries) return { tss: 0, kj: 0, distanceKm: 0, count: 0 };
        const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
        const recentRides = data.ridesSeries.filter(r => new Date(r.date) >= fourWeeksAgo);
        const tss = Math.round(recentRides.reduce((acc, r) => acc + (r.bikeTss || 0), 0));
        const kj = Math.round(
            (data.summary.totalKilojoules && data.ridesSeries.length > 0)
                ? (data.summary.totalKilojoules / data.ridesSeries.length) * recentRides.length
                : 0
        );
        const distanceKm = Number((recentRides.reduce((acc, r) => acc + r.distanceM, 0) / 1000).toFixed(1));
        return { tss, kj, distanceKm, count: recentRides.length };
    }, [data]);

    // Latest PMC metrics
    const latestPmc = useMemo(() => {
        if (!data?.pmcSeries || data.pmcSeries.length === 0) return null;
        return data.pmcSeries[data.pmcSeries.length - 1];
    }, [data?.pmcSeries]);

    // Active FTP resolution
    const activeFtpWatts = data?.ftp.ftpWatts ?? data?.ftp.eFtpWatts ?? null;
    const activeWPerKg = data?.ftp.wPerKg ?? null;

    // Format power trend chart points
    const powerTrendData = useMemo(() => {
        if (!data?.ridesSeries) return [];
        return data.ridesSeries.map(r => ({
            dateFormatted: format(new Date(r.date), 'MMM d'),
            fullDate: r.date,
            name: r.name,
            np: r.npWatts,
            avg: r.avgWatts,
            if: r.if,
            tss: r.bikeTss,
            deviceWatts: r.deviceWatts,
        }));
    }, [data?.ridesSeries]);

    // Format decoupling & EF chart points
    const efficiencyTrendData = useMemo(() => {
        if (!data?.ridesSeries) return [];
        return data.ridesSeries
            .filter(r => (r.ef !== null && r.ef > 0) || r.decouplingPct !== null)
            .map(r => ({
                dateFormatted: format(new Date(r.date), 'MMM d'),
                fullDate: r.date,
                name: r.name,
                ef: r.ef,
                decouplingPct: r.decouplingPct,
                isLowDecoupling: r.decouplingPct !== null && r.decouplingPct < 5,
            }));
    }, [data?.ridesSeries]);

    // Zone distribution totals
    const totalZoneSec = useMemo(() => {
        if (!data?.zoneDistributionSec) return 0;
        return data.zoneDistributionSec.reduce((a, b) => a + b, 0);
    }, [data?.zoneDistributionSec]);

    if (isLoading) {
        return (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-accent-orange" />
                <p className="text-foreground-muted text-sm font-medium">Loading cycling analytics...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="glass-card p-8 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-accent-pink mx-auto" />
                <h3 className="text-base font-semibold text-foreground">Could not load cycling analytics</h3>
                <p className="text-xs text-foreground-muted">Please refresh the page or try again in a moment.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* === HERO KPI STRIP === */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Active FTP */}
                <div className="glass-card p-4 relative group flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs text-foreground-muted mb-1">
                        <span className="flex items-center gap-1 font-medium">
                            <Zap className="w-3.5 h-3.5 text-accent-orange" /> Active FTP
                        </span>
                        <button
                            onClick={openEditModal}
                            className="p-1 text-foreground-muted opacity-0 group-hover:opacity-100 hover:text-accent-orange transition-all"
                            title="Edit FTP or auto-estimation"
                        >
                            <Edit2 className="w-3 h-3" />
                        </button>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-mono font-bold text-foreground tabular-nums">
                                {activeFtpWatts ? `${activeFtpWatts}` : '-'}
                            </span>
                            <span className="text-xs text-foreground-muted font-medium">W</span>
                        </div>
                        <div className="text-xs text-foreground-muted mt-0.5 flex items-center justify-between">
                            <span>{activeWPerKg ? `${activeWPerKg} W/kg` : 'Set weight'}</span>
                            {data.ftp.eFtpWatts && !data.ftp.ftpWatts && (
                                <span className="text-[10px] bg-accent-orange/15 text-accent-orange px-1.5 py-0.2 rounded-sm font-medium">
                                    Auto-eFTP
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Cycling VO2max & eFTP Card */}
                <div className="glass-card p-4 flex flex-col justify-between">
                    <div className="text-xs text-foreground-muted mb-1 flex items-center gap-1 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-accent-purple" /> Cycling VO2max
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-mono font-bold text-accent-purple tabular-nums">
                                {data.ftp.cyclingVo2max ? data.ftp.cyclingVo2max.toFixed(1) : '-'}
                            </span>
                            <span className="text-xs text-foreground-muted font-medium">mL/kg/min</span>
                        </div>
                        <div className="text-xs text-foreground-muted mt-0.5 flex items-center justify-between">
                            <span>eFTP: {data.ftp.eFtpWatts ? `${data.ftp.eFtpWatts} W` : '-'}</span>
                            <span className="text-[10px] text-accent-purple/90 font-mono">ACSM MAP</span>
                        </div>
                    </div>
                </div>

                {/* Bike PMC (CTL / ATL / TSB) */}
                <div className="glass-card p-4 flex flex-col justify-between">
                    <div className="text-xs text-foreground-muted mb-1 flex items-center gap-1 font-medium">
                        <ActivityIcon className="w-3.5 h-3.5 text-accent-cyan" /> Bike Fitness
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-mono font-bold text-accent-cyan tabular-nums">
                                {latestPmc?.ctlBike !== undefined ? latestPmc.ctlBike.toFixed(0) : '-'}
                            </span>
                            <span className="text-xs text-foreground-muted font-medium">CTL</span>
                        </div>
                        <div className="text-xs text-foreground-muted mt-0.5 flex items-center gap-2">
                            <span>ATL: <span className="text-foreground font-mono font-medium">{latestPmc?.atlBike?.toFixed(0) ?? 0}</span></span>
                            <span>TSB: <span className={`font-mono font-medium ${(latestPmc?.tsbBike ?? 0) >= 0 ? 'text-positive' : 'text-accent-pink'}`}>
                                {latestPmc?.tsbBike !== undefined ? (latestPmc.tsbBike > 0 ? `+${latestPmc.tsbBike.toFixed(0)}` : latestPmc.tsbBike.toFixed(0)) : 0}
                            </span></span>
                        </div>
                    </div>
                </div>

                {/* 4-Week Bike TSS */}
                <div className="glass-card p-4 flex flex-col justify-between">
                    <div className="text-xs text-foreground-muted mb-1 flex items-center gap-1 font-medium">
                        <TrendingUp className="w-3.5 h-3.5 text-accent-orange" /> 4-Wk Bike TSS
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-mono font-bold text-foreground tabular-nums">
                                {fourWeekStats.tss.toLocaleString()}
                            </span>
                            <span className="text-xs text-foreground-muted font-medium">pts</span>
                        </div>
                        <div className="text-xs text-foreground-muted mt-0.5">
                            {fourWeekStats.count} rides ({fourWeekStats.distanceKm} km)
                        </div>
                    </div>
                </div>

                {/* Total Work (kJ) */}
                <div className="glass-card p-4 flex flex-col justify-between">
                    <div className="text-xs text-foreground-muted mb-1 flex items-center gap-1 font-medium">
                        <Zap className="w-3.5 h-3.5 text-accent-yellow" /> Work & Energy
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-mono font-bold text-foreground tabular-nums">
                                {data.summary.totalKilojoules ? Math.round(data.summary.totalKilojoules).toLocaleString() : '-'}
                            </span>
                            <span className="text-xs text-foreground-muted font-medium">kJ</span>
                        </div>
                        <div className="text-xs text-foreground-muted mt-0.5">
                            Period mechanical output
                        </div>
                    </div>
                </div>

                {/* Efficiency Factor (EF) */}
                <div className="glass-card p-4 flex flex-col justify-between">
                    <div className="text-xs text-foreground-muted mb-1 flex items-center gap-1 font-medium">
                        <Heart className="w-3.5 h-3.5 text-accent-pink" /> Avg Aerobic EF
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-mono font-bold text-foreground tabular-nums">
                                {data.summary.avgEfficiencyFactor ? data.summary.avgEfficiencyFactor.toFixed(2) : '-'}
                            </span>
                            <span className="text-xs text-foreground-muted font-medium">W/bpm</span>
                        </div>
                        <div className="text-xs text-foreground-muted mt-0.5">
                            Normalized Power / Heart Rate
                        </div>
                    </div>
                </div>
            </div>

            {/* === SPLIT PMC CHART (CYLCLING FOCUS) === */}
            <SplitPmcChart
                data={data.pmcSeries}
                initialView="cycling"
                initialRange={range}
                onRangeChange={setRange}
                currentRange={range}
                title="Cycling Fitness & Fatigue (PMC)"
            />

            {/* === MEAN MAXIMAL POWER (MMP) CURVE === */}
            <PowerDurationCurveChart
                durationsSec={data.powerCurve.durationsSec}
                peakWatts={data.powerCurve.peakWatts}
                peakWkg={data.powerCurve.peakWkg}
                allTimePeakWatts={data.powerCurve.allTimePeakWatts}
                ftpWatts={activeFtpWatts}
                wPerKg={activeWPerKg}
                weightKg={data.ftp.weightKg}
            />

            {/* === POWER & INTENSITY TREND CHART === */}
            <div className="glass-card p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-accent-orange" />
                            <h3 className="text-lg font-semibold text-foreground">
                                Ride Power & Intensity Progression
                            </h3>
                        </div>
                        <p className="text-xs text-foreground-muted mt-1">
                            Normalized Power (NP), Average Power, Intensity Factor (IF), and Bike TSS per ride
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-foreground-muted">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-accent-orange rounded-xs inline-block" /> NP (W)
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-accent-cyan rounded-xs inline-block" /> Avg (W)
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-accent-purple rounded-full inline-block" /> IF
                        </span>
                    </div>
                </div>

                {powerTrendData.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center">
                        <TrendingUp className="w-12 h-12 text-foreground-muted opacity-40 mb-2" />
                        <p className="text-foreground-muted text-sm">No rides found in this time window</p>
                    </div>
                ) : (
                    <div className="h-72 w-full" role="img" aria-label="Ride power and intensity chart">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={powerTrendData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                                <XAxis
                                    dataKey="dateFormatted"
                                    stroke="var(--foreground-muted)"
                                    tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }}
                                    axisLine={{ stroke: 'var(--line)' }}
                                    tickLine={false}
                                />
                                <YAxis
                                    yAxisId="power"
                                    stroke="var(--foreground-muted)"
                                    tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }}
                                    axisLine={{ stroke: 'var(--line)' }}
                                    tickLine={false}
                                    unit="W"
                                />
                                <YAxis
                                    yAxisId="if"
                                    orientation="right"
                                    stroke="var(--foreground-muted)"
                                    tick={{ fill: 'var(--foreground-muted)', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    domain={[0.4, 1.3]}
                                />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (!active || !payload?.length) return null;
                                        const p = payload[0]?.payload;
                                        return (
                                            <div className="bg-background-secondary border border-line rounded-lg p-3 shadow-xl text-xs space-y-1.5 min-w-[190px]">
                                                <div className="font-semibold text-foreground border-b border-line pb-1">
                                                    <div>{p.name}</div>
                                                    <div className="text-[11px] font-normal text-foreground-muted">
                                                        {format(new Date(p.fullDate), 'MMM d, yyyy')}
                                                    </div>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-foreground-muted">Normalized Power (NP):</span>
                                                    <span className="font-mono font-bold text-accent-orange">{p.np ? `${p.np} W` : '-'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-foreground-muted">Avg Power:</span>
                                                    <span className="font-mono text-accent-cyan">{p.avg ? `${p.avg} W` : '-'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-foreground-muted">Intensity Factor (IF):</span>
                                                    <span className="font-mono text-accent-purple">{p.if ? p.if.toFixed(2) : '-'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-foreground-muted">Bike TSS:</span>
                                                    <span className="font-mono text-foreground">{p.tss ? Math.round(p.tss) : '-'}</span>
                                                </div>
                                                <div className="pt-1 border-t border-line text-[10px] text-foreground-muted flex items-center gap-1">
                                                    <ShieldCheck className="w-3 h-3 text-positive" />
                                                    {p.deviceWatts ? 'Power Meter Data' : 'Estimated Power'}
                                                </div>
                                            </div>
                                        );
                                    }}
                                />
                                <Bar
                                    yAxisId="power"
                                    dataKey="np"
                                    name="Normalized Power"
                                    fill="#f97316"
                                    radius={[3, 3, 0, 0]}
                                    maxBarSize={16}
                                />
                                <Bar
                                    yAxisId="power"
                                    dataKey="avg"
                                    name="Avg Power"
                                    fill="#06b6d4"
                                    opacity={0.7}
                                    radius={[3, 3, 0, 0]}
                                    maxBarSize={16}
                                />
                                <Line
                                    yAxisId="if"
                                    type="monotone"
                                    dataKey="if"
                                    name="Intensity Factor"
                                    stroke="#a855f7"
                                    strokeWidth={2}
                                    dot={{ fill: '#a855f7', r: 3 }}
                                />
                                {activeFtpWatts && (
                                    <ReferenceLine
                                        yAxisId="power"
                                        y={activeFtpWatts}
                                        stroke="#06b6d4"
                                        strokeDasharray="4 4"
                                    />
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* === 7-ZONE COGGAN POWER DISTRIBUTION === */}
            <div className="glass-card p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <ActivityIcon className="w-5 h-5 text-accent-cyan" />
                            <h3 className="text-lg font-semibold text-foreground">
                                7-Zone Coggan Power Distribution
                            </h3>
                        </div>
                        <p className="text-xs text-foreground-muted mt-1">
                            Time spent in physiological power zones relative to Active FTP ({activeFtpWatts || 250} W)
                        </p>
                    </div>
                </div>

                {totalZoneSec === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-center">
                        <ActivityIcon className="w-10 h-10 text-foreground-muted opacity-40 mb-2" />
                        <p className="text-foreground-muted text-sm">No power zone data recorded in this period</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Stacked Horizontal Bar */}
                        <div className="w-full h-8 rounded-lg overflow-hidden flex bg-background-tertiary">
                            {ZONE_COLORS.map((z, idx) => {
                                const sec = data.zoneDistributionSec[idx] ?? 0;
                                const pct = totalZoneSec > 0 ? (sec / totalZoneSec) * 100 : 0;
                                if (pct <= 0) return null;
                                return (
                                    <div
                                        key={idx}
                                        className={`${z.bg} hover:brightness-110 transition-all flex items-center justify-center relative group`}
                                        style={{ width: `${pct}%` }}
                                        title={`${z.label}: ${formatTime(sec)} (${pct.toFixed(1)}%)`}
                                    >
                                        {pct >= 6 && (
                                            <span className="text-[11px] font-bold text-white drop-shadow-xs">
                                                Z{idx + 1}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Breakdown Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead>
                                    <tr className="border-b border-line text-foreground-muted">
                                        <th className="py-2 px-3 font-semibold">Zone</th>
                                        <th className="py-2 px-3 font-semibold">% FTP</th>
                                        <th className="py-2 px-3 font-semibold">Watts</th>
                                        {data.ftp.weightKg && <th className="py-2 px-3 font-semibold">W/kg</th>}
                                        <th className="py-2 px-3 font-semibold text-right">Time</th>
                                        <th className="py-2 px-3 font-semibold text-right">% of Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                    {ZONE_COLORS.map((z, idx) => {
                                        const sec = data.zoneDistributionSec[idx] ?? 0;
                                        const pct = totalZoneSec > 0 ? (sec / totalZoneSec) * 100 : 0;
                                        const zoneInfo = data.ftp.zones[idx];

                                        const wattsRange = zoneInfo
                                            ? idx === 6
                                                ? `> ${zoneInfo.minWatts} W`
                                                : `${zoneInfo.minWatts} - ${zoneInfo.maxWatts} W`
                                            : '-';

                                        const wkgRange = zoneInfo?.minWkg !== null && zoneInfo?.minWkg !== undefined
                                            ? idx === 6
                                                ? `> ${zoneInfo.minWkg}`
                                                : `${zoneInfo.minWkg} - ${zoneInfo.maxWkg ?? ''}`
                                            : null;

                                        return (
                                            <tr key={idx} className="hover:bg-surface-hover transition-colors">
                                                <td className="py-2.5 px-3 flex items-center gap-2">
                                                    <span className={`w-2.5 h-2.5 rounded-full ${z.bg} inline-block`} />
                                                    <span className="font-medium text-foreground">{z.label}</span>
                                                </td>
                                                <td className="py-2.5 px-3 font-mono text-foreground-muted">{z.pct}</td>
                                                <td className="py-2.5 px-3 font-mono font-medium text-foreground">{wattsRange}</td>
                                                {data.ftp.weightKg && (
                                                    <td className="py-2.5 px-3 font-mono text-foreground-muted">{wkgRange || '-'}</td>
                                                )}
                                                <td className="py-2.5 px-3 font-mono font-medium text-foreground text-right">
                                                    {formatTime(sec)}
                                                </td>
                                                <td className="py-2.5 px-3 font-mono text-foreground-muted text-right">
                                                    {pct.toFixed(1)}%
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* === AEROBIC EFFICIENCY & DECOUPLING (EF & Pw:HR) === */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                        <div>
                            <div className="flex items-center gap-2">
                                <Heart className="w-5 h-5 text-accent-pink" />
                                <h3 className="text-lg font-semibold text-foreground">
                                    Aerobic Efficiency & Decoupling (EF & Pw:HR)
                                </h3>
                            </div>
                            <p className="text-xs text-foreground-muted mt-1">
                                Tracks aerobic development (NP ÷ HR) and cardiac drift during endurance efforts
                            </p>
                        </div>
                    </div>

                    {efficiencyTrendData.length === 0 ? (
                        <div className="h-60 flex flex-col items-center justify-center text-center">
                            <Heart className="w-10 h-10 text-foreground-muted opacity-40 mb-2" />
                            <p className="text-foreground-muted text-sm">No heart rate and power pairs recorded</p>
                            <p className="text-xs text-foreground-muted mt-1">
                                Rides with both a heart rate monitor and power meter will show aerobic efficiency
                            </p>
                        </div>
                    ) : (
                        <div className="h-64 w-full" role="img" aria-label="Aerobic efficiency and decoupling chart">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={efficiencyTrendData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                                    <XAxis
                                        dataKey="dateFormatted"
                                        stroke="var(--foreground-muted)"
                                        tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }}
                                        axisLine={{ stroke: 'var(--line)' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        yAxisId="ef"
                                        stroke="var(--foreground-muted)"
                                        tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }}
                                        axisLine={{ stroke: 'var(--line)' }}
                                        tickLine={false}
                                        domain={['dataMin - 0.2', 'dataMax + 0.2']}
                                        unit=" EF"
                                    />
                                    <YAxis
                                        yAxisId="decoupling"
                                        orientation="right"
                                        stroke="var(--foreground-muted)"
                                        tick={{ fill: 'var(--foreground-muted)', fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                        unit="%"
                                    />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (!active || !payload?.length) return null;
                                            const p = payload[0]?.payload;
                                            const isGood = p.decouplingPct !== null && p.decouplingPct < 5;
                                            return (
                                                <div className="bg-background-secondary border border-line rounded-lg p-3 shadow-xl text-xs space-y-1.5 min-w-[200px]">
                                                    <div className="font-semibold text-foreground border-b border-line pb-1">
                                                        <div>{p.name}</div>
                                                        <div className="text-[11px] font-normal text-foreground-muted">
                                                            {format(new Date(p.fullDate), 'MMM d, yyyy')}
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-foreground-muted">Efficiency Factor (EF):</span>
                                                        <span className="font-mono font-bold text-accent-pink">
                                                            {p.ef ? `${p.ef.toFixed(2)} W/bpm` : '-'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-foreground-muted">Decoupling (Pw:HR):</span>
                                                        <span className={`font-mono font-bold ${isGood ? 'text-positive' : 'text-accent-orange'}`}>
                                                            {p.decouplingPct !== null ? `${p.decouplingPct > 0 ? '+' : ''}${p.decouplingPct.toFixed(1)}%` : '-'}
                                                        </span>
                                                    </div>
                                                    {p.decouplingPct !== null && (
                                                        <div className={`mt-1 p-1 rounded-sm text-[10px] font-medium ${
                                                            isGood ? 'bg-positive/10 text-positive' : 'bg-accent-orange/10 text-accent-orange'
                                                        }`}>
                                                            {isGood
                                                                ? 'Strong Aerobic Durability (< 5% drift)'
                                                                : 'Cardiac Drift (> 5% decoupling)'}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }}
                                    />
                                    <ReferenceLine
                                        yAxisId="decoupling"
                                        y={5}
                                        stroke="#f97316"
                                        strokeDasharray="3 3"
                                        label={{ value: '5% Decoupling Limit', fill: '#f97316', fontSize: 10, position: 'right' }}
                                    />
                                    <Line
                                        yAxisId="ef"
                                        type="monotone"
                                        dataKey="ef"
                                        name="Efficiency Factor (EF)"
                                        stroke="#ec4899"
                                        strokeWidth={2.5}
                                        dot={{ fill: '#ec4899', r: 3.5 }}
                                    />
                                    <Bar
                                        yAxisId="decoupling"
                                        dataKey="decouplingPct"
                                        name="Decoupling %"
                                        fill="#f97316"
                                        opacity={0.4}
                                        maxBarSize={12}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Explanatory Info Card */}
                <div className="glass-card p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Info className="w-5 h-5 text-accent-cyan" />
                            <h4 className="font-semibold text-foreground text-sm">Understanding Cycling Metrics</h4>
                        </div>
                        <div className="space-y-4 text-xs text-foreground-muted leading-relaxed">
                            <div>
                                <span className="font-semibold text-foreground block mb-0.5">Efficiency Factor (EF = NP / HR)</span>
                                As aerobic conditioning improves, you produce higher Normalized Watts for the exact same heart rate. A rising EF indicates aerobic gains.
                            </div>
                            <div>
                                <span className="font-semibold text-foreground block mb-0.5">Aerobic Decoupling (Pw:HR)</span>
                                Compares the ratio of Power to Heart Rate in the first half vs. the second half of a steady ride.
                                <div className="mt-1 flex items-center gap-2 text-positive font-medium">
                                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                    <span>&lt; 5% drift indicates solid aerobic durability.</span>
                                </div>
                            </div>
                            <div>
                                <span className="font-semibold text-foreground block mb-0.5">FTP & Coggan Power Zones</span>
                                7 physiological zones calibrated from Functional Threshold Power. Structured training targets specific energy pathways.
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={openEditModal}
                        className="mt-4 w-full py-2 px-3 rounded-md bg-background-tertiary border border-line hover:bg-surface-hover text-foreground font-medium text-xs flex items-center justify-center gap-2 transition-colors"
                    >
                        <Edit2 className="w-3.5 h-3.5 text-accent-orange" />
                        Configure Active FTP & Zones
                    </button>
                </div>
            </div>

            {/* === INLINE FTP EDIT MODAL === */}
            {isFtpModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-background border border-line rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-in">
                        <div className="flex items-center justify-between border-b border-line pb-3">
                            <div className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-accent-orange" />
                                <h3 className="font-bold text-foreground text-base">Configure Cycling FTP</h3>
                            </div>
                            <button
                                onClick={() => setIsFtpModalOpen(false)}
                                className="p-1 text-foreground-muted hover:text-foreground rounded-md transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {editError && (
                            <div className="p-3 rounded-md bg-accent-pink/10 border border-accent-pink/20 text-accent-pink text-xs">
                                {editError}
                            </div>
                        )}

                        <form onSubmit={handleSaveFtp} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1">
                                    Manual Functional Threshold Power (FTP)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="30"
                                        max="800"
                                        step="1"
                                        placeholder={data.ftp.eFtpWatts ? `${data.ftp.eFtpWatts} (suggested)` : 'e.g. 250'}
                                        value={inputFtp}
                                        onChange={(e) => setInputFtp(e.target.value)}
                                        className="w-full px-3 py-2 bg-background-secondary border border-line rounded-lg text-sm text-foreground focus:outline-hidden focus:border-accent-orange"
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-foreground-muted font-mono">
                                        Watts
                                    </span>
                                </div>
                                <p className="text-[11px] text-foreground-muted mt-1">
                                    Leave blank to use auto-estimated eFTP ({data.ftp.eFtpWatts || 200} W).
                                </p>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-background-tertiary border border-line">
                                <div>
                                    <div className="text-xs font-semibold text-foreground">Auto-Estimate FTP (eFTP)</div>
                                    <div className="text-[11px] text-foreground-muted">
                                        Continuously update FTP based on hard 5m-20m intervals
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={autoEstimate}
                                    onChange={(e) => setAutoEstimate(e.target.checked)}
                                    className="w-4 h-4 accent-accent-orange rounded-sm"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                                <button
                                    type="button"
                                    onClick={() => setIsFtpModalOpen(false)}
                                    className="px-4 py-2 text-xs font-medium text-foreground-muted hover:text-foreground rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={ftpMutation.isPending}
                                    className="px-4 py-2 text-xs font-semibold bg-accent-orange text-white rounded-lg hover:bg-accent-orange/90 transition-all flex items-center gap-1.5 shadow-xs"
                                >
                                    {ftpMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                                    Save FTP Settings
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
