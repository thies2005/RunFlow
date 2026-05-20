'use client';

import { useMemo } from 'react';
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
} from '../../lib/analysisUtils';

interface AnalysisViewProps {
    workouts: Array<{
        id: string;
        scheduledDate: string | Date;
        workoutType: string;
        targetDistance: number | null;
        targetDuration: number | null;
        targetHrZone: number | null;
        phase: string;
    }>;
    goalId: string;
    raceDate?: Date | null;
    raceType?: string | null;
    isNoRace?: boolean;
}

export function AnalysisView({ workouts, goalId, raceDate, raceType, isNoRace }: AnalysisViewProps) {
    const weeks = useMemo(() => groupByIsoWeek(workouts), [workouts]);
    const volumeData = useMemo(() => weeklyRunningVolume(weeks), [weeks]);
    const longRunData = useMemo(() => longRunProgression(workouts), [workouts]);
    const loadData = useMemo(() => weeklyLoadByModality(weeks), [weeks]);
    const typeData = useMemo(() => workoutTypeDistribution(workouts), [workouts]);
    const hrZoneData = useMemo(() => hrZoneDistribution(workouts), [workouts]);
    const phaseBands = useMemo(() => computePhaseBands(weeks), [weeks]);

    return (
        <div className="flex-1 overflow-y-auto p-6">
            <AiSummaryBar goalId={goalId} isNoRace={isNoRace} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
            </div>
        </div>
    );
}
