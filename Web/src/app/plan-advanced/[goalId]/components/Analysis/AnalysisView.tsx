'use client';

import { useMemo } from 'react';
import {
    ResponsiveContainer,
    ComposedChart,
    Bar,
    Line,
    Cell,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid,
} from 'recharts';
import { LazyChartWrapper } from '@/components/LazyChartWrapper';
import { AiSummaryBar } from './AiSummaryBar';
import { ChartCard } from './ChartCard';
import { WeeklyVolumeChart } from './WeeklyVolumeChart';
import { LongRunProgressionChart } from './LongRunProgressionChart';
import { WeeklyLoadChart } from './WeeklyLoadChart';
import { WorkoutTypeDonut } from './WorkoutTypeDonut';
import { HrZonePyramid } from './HrZonePyramid';
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
    type WorkoutItem,
} from '../../lib/analysisUtils';

interface AnalysisViewProps {
    workouts: WorkoutItem[] | Array<{
        id: string;
        scheduledDate: string | Date;
        workoutType: string;
        targetDistance: number | null;
        targetDuration: number | null;
        targetHrZone: number | null;
        phase: string;
        sport?: string | null;
        isCompleted?: boolean;
        plannedTss?: number | null;
        targetPowerWatts?: number | null;
        targetPowerMinWatts?: number | null;
        targetPowerMaxWatts?: number | null;
        targetFtpPercent?: number | null;
        structuredSteps?: any;
        linkedActivity?: any;
    }>;
    goalId: string;
    raceDate?: Date | null;
    raceType?: string | null;
    isNoRace?: boolean;
}

export function AnalysisView({ workouts, goalId, raceDate, raceType, isNoRace }: AnalysisViewProps) {
    const weeks = useMemo(() => groupByIsoWeek(workouts as WorkoutItem[]), [workouts]);
    const volumeData = useMemo(() => weeklyRunningVolume(weeks), [weeks]);
    const longRunData = useMemo(() => longRunProgression(workouts as WorkoutItem[]), [workouts]);
    const loadData = useMemo(() => weeklyLoadByModality(weeks), [weeks]);
    const typeData = useMemo(() => workoutTypeDistribution(workouts as WorkoutItem[]), [workouts]);
    const hrZoneData = useMemo(() => hrZoneDistribution(workouts as WorkoutItem[]), [workouts]);
    const phaseBands = useMemo(() => computePhaseBands(weeks), [weeks]);
    const tssData = useMemo(() => weeklyTssProgression(weeks), [weeks]);
    const cyclingVolumeData = useMemo(() => weeklyCyclingVolume(weeks), [weeks]);
    const powerZoneData = useMemo(() => powerZoneDistribution(workouts as WorkoutItem[]), [workouts]);
    const hasRunning = useMemo(() => volumeData.some((d) => d.km > 0) || longRunData.length > 0, [volumeData, longRunData]);
    const hasCycling = useMemo(() => cyclingVolumeData.some((d) => d.km > 0 || d.hours > 0), [cyclingVolumeData]);
    const hideRunningCharts = !hasRunning && hasCycling;

    return (
        <div className="flex-1 overflow-y-auto p-6">
            <AiSummaryBar goalId={goalId} isNoRace={isNoRace} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
