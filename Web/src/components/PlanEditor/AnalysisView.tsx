'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, isSameDay } from 'date-fns';
import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Line,
    Bar,
    Cell,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ReferenceLine,
    CartesianGrid,
} from 'recharts';
import { LazyChartWrapper } from '@/components/LazyChartWrapper';
import { AiSummaryBar } from '@/app/plan-advanced/[goalId]/components/Analysis/AiSummaryBar';
import { ChartCard } from '@/app/plan-advanced/[goalId]/components/Analysis/ChartCard';
import { WeeklyVolumeChart } from '@/app/plan-advanced/[goalId]/components/Analysis/WeeklyVolumeChart';
import { LongRunProgressionChart } from '@/app/plan-advanced/[goalId]/components/Analysis/LongRunProgressionChart';
import { WeeklyLoadChart } from '@/app/plan-advanced/[goalId]/components/Analysis/WeeklyLoadChart';
import { WorkoutTypeDonut } from '@/app/plan-advanced/[goalId]/components/Analysis/WorkoutTypeDonut';
import { HrZonePyramid } from '@/app/plan-advanced/[goalId]/components/Analysis/HrZonePyramid';
import {
    groupByIsoWeek,
    weeklyRunningVolume,
    longRunProgression,
    weeklyLoadByModality,
    workoutTypeDistribution,
    hrZoneDistribution,
    computePhaseBands,
    weeklyTssProgression,
    weeklyCyclingVolume,
    powerZoneDistribution,
} from '@/app/plan-advanced/[goalId]/lib/analysisUtils';
import {
    calculateWorkoutPlannedTss,
    calculateProjectedFitness,
    type PlannedDailyLoad,
    type ProjectedFitnessPoint,
} from '@/lib/metrics/plannedTss';
import type { Workout } from './WorkoutDetailPanel';

interface AnalysisViewProps {
    workouts: Workout[];
    goalId: string;
    raceDate?: Date | null;
    raceType?: string | null;
    isNoRace?: boolean;
}

export function AnalysisView({ workouts, goalId, raceDate, raceType, isNoRace }: AnalysisViewProps) {
    const weeks = useMemo(() => groupByIsoWeek(workouts as any), [workouts]);
    const volumeData = useMemo(() => weeklyRunningVolume(weeks), [weeks]);
    const longRunData = useMemo(() => longRunProgression(workouts as any), [workouts]);
    const loadData = useMemo(() => weeklyLoadByModality(weeks), [weeks]);
    const typeData = useMemo(() => workoutTypeDistribution(workouts as any), [workouts]);
    const hrZoneData = useMemo(() => hrZoneDistribution(workouts as any), [workouts]);
    const phaseBands = useMemo(() => computePhaseBands(weeks), [weeks]);
    const tssData = useMemo(() => weeklyTssProgression(weeks), [weeks]);
    const cyclingVolumeData = useMemo(() => weeklyCyclingVolume(weeks), [weeks]);
    const powerZoneData = useMemo(() => powerZoneDistribution(workouts as any), [workouts]);
    const hasRunning = useMemo(() => volumeData.some((d) => d.km > 0) || longRunData.length > 0, [volumeData, longRunData]);
    const hasCycling = useMemo(() => cyclingVolumeData.some((d) => d.km > 0 || d.hours > 0), [cyclingVolumeData]);
    const hideRunningCharts = !hasRunning && hasCycling;

    // Fetch server-side Planned-vs-Actual PMC curve (with actual DailyFitness)
    const { data: serverFitnessData } = useQuery<{
        data: Array<{
            date: string;
            plannedCtl: number;
            plannedAtl: number;
            plannedTsb: number;
            actualTss: number;
            plannedTss: number;
        }>;
    }>({
        queryKey: ['plan-advanced', goalId, 'planned-fitness'],
        queryFn: async () => {
            const res = await fetch(`/api/plan-advanced/${goalId}/planned-fitness`);
            if (!res.ok) return { data: [] };
            return res.json();
        },
        staleTime: 60_000,
    });

    // Client-side live projected fitness updated on any workout edit/drag
    const projectedPmcData = useMemo(() => {
        if (workouts.length === 0) return [];

        // Build contiguous date range
        const dates = workouts
            .map((w) => new Date(w.scheduledDate).getTime())
            .filter((t) => !isNaN(t));

        if (raceDate) dates.push(new Date(raceDate).getTime());
        if (dates.length === 0) return [];

        const minTime = Math.min(...dates);
        const maxTime = Math.max(...dates);

        const dailyLoads: PlannedDailyLoad[] = [];
        for (let d = new Date(minTime); d.getTime() <= maxTime; d.setDate(d.getDate() + 1)) {
            const curDate = new Date(d);
            const dayWorkouts = workouts.filter((w) => isSameDay(new Date(w.scheduledDate), curDate));
            let planned = 0;
            for (const w of dayWorkouts) {
                const tss = w.plannedTss ?? calculateWorkoutPlannedTss(w as any);
                if (tss) planned += tss;
            }
            dailyLoads.push({
                date: curDate,
                plannedTss: planned,
                actualTss: 0,
            });
        }

        // Initial values from server data if available
        let initialCtl = 45;
        let initialAtl = 45;
        const curvePoints = (serverFitnessData as any)?.curve ?? serverFitnessData?.data ?? [];
        if (curvePoints.length > 0) {
            initialCtl = curvePoints[0].plannedCtl || 45;
            initialAtl = curvePoints[0].plannedAtl || 45;
        }

        const points = calculateProjectedFitness(dailyLoads, { initialCtl, initialAtl });

        return points.map((p) => ({
            date: format(p.date, 'MMM d'),
            rawDate: p.date,
            ctl: p.plannedCtl,
            atl: p.plannedAtl,
            tsb: p.plannedTsb,
            plannedTss: p.plannedTss,
        }));
    }, [workouts, raceDate, serverFitnessData]);

    const raceDayPoint = useMemo(() => {
        if (!raceDate || projectedPmcData.length === 0) return null;
        return projectedPmcData[projectedPmcData.length - 1];
    }, [raceDate, projectedPmcData]);

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AiSummaryBar goalId={goalId} isNoRace={isNoRace} />

            {/* Projected PMC Live Chart */}
            <ChartCard
                title="Projected Performance Management Chart (PMC)"
                tooltip="Live Banister impulse-response model projecting CTL (Fitness), ATL (Fatigue), and TSB (Form) to Race Day"
                isEmpty={projectedPmcData.length === 0}
                emptyMessage="No workout data available to project fitness"
            >
                {raceDayPoint && (
                    <div className="flex items-center gap-6 px-4 py-2 mb-2 bg-background-tertiary/40 border border-glass-border rounded-md text-xs font-mono">
                        <div>
                            <span className="text-[10px] text-foreground-muted block uppercase">Race-Day Fitness (CTL)</span>
                            <span className="text-sm font-semibold text-accent-blue">{raceDayPoint.ctl}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-foreground-muted block uppercase">Race-Day Fatigue (ATL)</span>
                            <span className="text-sm font-semibold text-workout-tempo">{raceDayPoint.atl}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-foreground-muted block uppercase">Race-Day Form (TSB)</span>
                            <span
                                className={`text-sm font-semibold ${
                                    raceDayPoint.tsb >= 5 && raceDayPoint.tsb <= 25
                                        ? 'text-positive'
                                        : raceDayPoint.tsb < 0
                                        ? 'text-negative'
                                        : 'text-workout-tempo'
                                }`}
                            >
                                {raceDayPoint.tsb > 0 ? `+${raceDayPoint.tsb}` : raceDayPoint.tsb}
                            </span>
                        </div>
                        <div className="ml-auto text-[11px] text-foreground-muted font-sans hidden sm:block">
                            Optimal race freshness: <span className="text-positive font-mono">+10 to +25</span>
                        </div>
                    </div>
                )}

                <LazyChartWrapper height="18rem">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={projectedPmcData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--line, rgba(255,255,255,0.08))" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fill: 'var(--foreground-muted, #888)' }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: 'var(--foreground-muted, #888)' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--background-secondary, #1a1a1a)',
                                    borderColor: 'var(--glass-border, #333)',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                            <ReferenceLine y={25} stroke="rgba(16,185,129,0.3)" strokeDasharray="2 2" />
                            <ReferenceLine y={-20} stroke="rgba(239,68,68,0.3)" strokeDasharray="2 2" />

                            <Area
                                type="monotone"
                                dataKey="tsb"
                                name="Form (TSB)"
                                fill="rgba(232, 80, 26, 0.15)"
                                stroke="#E8501A"
                                strokeWidth={1.5}
                            />
                            <Line
                                type="monotone"
                                dataKey="ctl"
                                name="Fitness (CTL)"
                                stroke="#0284c7"
                                strokeWidth={2}
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="atl"
                                name="Fatigue (ATL)"
                                stroke="#f59e0b"
                                strokeWidth={1.5}
                                strokeDasharray="4 4"
                                dot={false}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </LazyChartWrapper>
            </ChartCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Weekly TSS Progression (Planned vs. Completed) */}
                <div className="md:col-span-2">
                    <ChartCard
                        title="Weekly TSS Progression (Planned vs. Completed)"
                        tooltip="Planned TSS training stress score per week and actual completed TSS"
                        isEmpty={tssData.every((d) => d.plannedTss === 0 && d.actualTss === 0)}
                        emptyMessage="No planned TSS data available"
                    >
                        <LazyChartWrapper height="16rem">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={tssData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line, rgba(255,255,255,0.08))" />
                                    <XAxis
                                        dataKey="weekLabel"
                                        tick={{ fontSize: 10, fill: 'var(--foreground-muted, #888)' }}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 10, fill: 'var(--foreground-muted, #888)' }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--background-secondary, #1a1a1a)',
                                            borderColor: 'var(--glass-border, #333)',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                    <Bar dataKey="plannedTss" name="Planned TSS" fill="#3b82f6" fillOpacity={0.6} radius={[4, 4, 0, 0]} />
                                    <Line type="monotone" dataKey="actualTss" name="Completed TSS" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </LazyChartWrapper>
                    </ChartCard>
                </div>

                {/* Weekly Cycling Volume (km) whenever hasCycling is true */}
                {hasCycling && (
                    <div className="md:col-span-2">
                        <ChartCard
                            title="Weekly Cycling Volume (km)"
                            tooltip="Cycling distance per week estimated from duration/distance targets"
                            isEmpty={cyclingVolumeData.every((d) => d.km === 0 && d.actualKm === 0)}
                            emptyMessage="No cycling volume found in plan"
                        >
                            <LazyChartWrapper height="16rem">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={cyclingVolumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line, rgba(255,255,255,0.08))" />
                                        <XAxis
                                            dataKey="weekLabel"
                                            tick={{ fontSize: 10, fill: 'var(--foreground-muted, #888)' }}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 10, fill: 'var(--foreground-muted, #888)' }}
                                            unit="km"
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'var(--background-secondary, #1a1a1a)',
                                                borderColor: 'var(--glass-border, #333)',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                            }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                        <Bar dataKey="km" name="Planned Ride (km)" fill="#06b6d4" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
                                        <Line type="monotone" dataKey="actualKm" name="Completed (km)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </LazyChartWrapper>
                        </ChartCard>
                    </div>
                )}

                {!hideRunningCharts && (
                    <>
                        <div className="md:col-span-2">
                            <ChartCard
                                title="Weekly Running Volume"
                                tooltip="Running distance per week colored by training phase"
                                isEmpty={volumeData.every((d) => d.km === 0)}
                                emptyMessage="No running distance data assigned"
                            >
                                <LazyChartWrapper height="16rem">
                                    <WeeklyVolumeChart data={volumeData} phaseBands={phaseBands} />
                                </LazyChartWrapper>
                            </ChartCard>
                        </div>

                        <div className="md:col-span-2">
                            <ChartCard
                                title="Long Run Progression"
                                tooltip="Distance trend for all long runs across the plan"
                                isEmpty={longRunData.length === 0}
                                emptyMessage="No long runs found in plan"
                            >
                                <LazyChartWrapper height="16rem">
                                    <LongRunProgressionChart data={longRunData} />
                                </LazyChartWrapper>
                            </ChartCard>
                        </div>
                    </>
                )}

                <ChartCard
                    title="Weekly Load by Modality"
                    tooltip="Training hours per week split by sport type"
                    isEmpty={loadData.every((d) => d.run === 0 && d.bike === 0 && d.swim === 0 && d.strength === 0)}
                    emptyMessage="No duration data assigned"
                >
                    <LazyChartWrapper height="16rem">
                        <WeeklyLoadChart data={loadData} />
                    </LazyChartWrapper>
                </ChartCard>

                <ChartCard
                    title="Workout Type Distribution"
                    tooltip="Breakdown of session types in your plan"
                    isEmpty={typeData.length === 0}
                    emptyMessage="No workout types found"
                >
                    <LazyChartWrapper height="16rem">
                        <WorkoutTypeDonut data={typeData} />
                    </LazyChartWrapper>
                </ChartCard>

                {hasCycling && (
                    <div className="md:col-span-2">
                        <ChartCard
                            title="Cycling Power Zone Distribution"
                            tooltip="Target training hours per Coggan power zone"
                            isEmpty={powerZoneData.every((d) => d.hours === 0)}
                            emptyMessage="No cycling power zone data assigned"
                        >
                            <LazyChartWrapper height="14rem">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={powerZoneData} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line, rgba(255,255,255,0.08))" />
                                        <XAxis type="number" unit="h" tick={{ fontSize: 10, fill: 'var(--foreground-muted, #888)' }} />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--foreground-muted, #888)' }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'var(--background-secondary, #1a1a1a)',
                                                borderColor: 'var(--glass-border, #333)',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                            }}
                                        />
                                        <Bar dataKey="hours" name="Hours" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                                            {powerZoneData.map((entry) => (
                                                <Cell key={`power-zone-${entry.zone}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </LazyChartWrapper>
                        </ChartCard>
                    </div>
                )}

                {!hideRunningCharts && (
                    <div className="md:col-span-2">
                        <ChartCard
                            title="HR Zone Distribution"
                            tooltip="Kilometers per heart rate zone for running workouts (80/20 rule check)"
                            isEmpty={hrZoneData.every((d) => d.km === 0)}
                            emptyMessage="No HR zone data assigned"
                        >
                            <LazyChartWrapper height="14rem">
                                <HrZonePyramid data={hrZoneData} />
                            </LazyChartWrapper>
                        </ChartCard>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AnalysisView;
