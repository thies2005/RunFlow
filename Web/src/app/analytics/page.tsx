'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { TimeRange } from '@/components/CombinedAnalyticsChart';
import { useAnalyticsMetrics } from '@/hooks/useAnalyticsMetrics';
import AnalyticsView from '@/components/views/AnalyticsView';

const ShapeCalibrationModal = dynamic(() => import('@/components/ShapeCalibrationModal'), { ssr: false });

export default function AnalyticsPage() {
    const { status } = useSession();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
    const [timeRange, setTimeRange] = useState<TimeRange>('1Y');
    const [zonesTimeRange, setZonesTimeRange] = useState<'1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL'>('1Y');

    const { data: activitiesData, isLoading } = useQuery({
        queryKey: ['all-activities'],
        queryFn: async () => {
            const res = await fetch('/api/activities?limit=500');
            if (!res.ok) throw new Error('Failed to fetch activities');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    const { data: userData } = useQuery({
        queryKey: ['user-settings'],
        queryFn: async () => {
            const res = await fetch('/api/settings/update-vdot');
            if (!res.ok) throw new Error('Failed to fetch user settings');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    const { data: goalsData } = useQuery({
        queryKey: ['goals'],
        queryFn: async () => {
            const res = await fetch('/api/goals');
            if (!res.ok) throw new Error('Failed to fetch goals');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    const { data: statsData } = useQuery({
        queryKey: ['analytics-stats'],
        queryFn: async () => {
            const res = await fetch('/api/analytics/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    const { data: historyData } = useQuery({
        queryKey: ['analytics-history', timeRange],
        queryFn: async () => {
            const rangeMap: Record<string, string> = {
                ALL: 'ALL',
                '1Y': '1_YEAR',
                '6M': '6_MONTHS',
                '3M': '12_WEEKS',
                '1M': '4_WEEKS',
            };
            const res = await fetch(`/api/analytics/history?range=${rangeMap[timeRange] || '1_YEAR'}`);
            if (!res.ok) throw new Error('Failed to fetch history');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    const { data: cyclingData } = useQuery({
        queryKey: ['cycling-analytics', timeRange],
        queryFn: async () => {
            const rangeMap: Record<string, string> = {
                ALL: 'all',
                '1Y': '1y',
                '6M': '180d',
                '3M': '90d',
                '1M': '42d',
            };
            const res = await fetch(`/api/analytics/cycling?range=${rangeMap[timeRange] || '90d'}`);
            if (!res.ok) return null;
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    const recalculateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/settings/recalculate-vdot', { method: 'POST' });
            if (!res.ok) throw new Error('Failed to recalculate');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-activities'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-history'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
            queryClient.invalidateQueries({ queryKey: ['cycling-analytics'] });
        },
    });

    const analyticsMetrics = useAnalyticsMetrics(
        activitiesData,
        goalsData,
        statsData,
        historyData,
        userData
    );

    if (status === 'unauthenticated') {
        router.push('/login');
        return null;
    }

    if (status === 'loading' || isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-foreground-muted">Loading analytics...</div>
            </div>
        );
    }

    return (
        <>
            <AnalyticsView
                runalyzeMetrics={analyticsMetrics.runalyzeMetrics}
                vo2TrendData={analyticsMetrics.vo2TrendData}
                shapeTrendData={analyticsMetrics.shapeTrendData}
                fitnessData={analyticsMetrics.fitnessData}
                combinedData={analyticsMetrics.combinedData}
                trainingPaces={analyticsMetrics.trainingPaces}
                userData={userData}
                activitiesData={activitiesData}
                cyclingData={cyclingData}
                timeRange={timeRange}
                zonesTimeRange={zonesTimeRange}
                setTimeRange={setTimeRange}
                setZonesTimeRange={setZonesTimeRange}
                onRecalculate={() => recalculateMutation.mutate()}
                isRecalculating={recalculateMutation.isPending}
                onOpenCalibration={() => setIsCalibrationOpen(true)}
                showHeader={true}
            />

            <ShapeCalibrationModal
                isOpen={isCalibrationOpen}
                onClose={() => setIsCalibrationOpen(false)}
                currentFactor={analyticsMetrics.runalyzeMetrics.calibrationFactor}
                effectiveVO2max={analyticsMetrics.runalyzeMetrics.effectiveVO2max}
                rawVO2max={analyticsMetrics.runalyzeMetrics.rawVO2max}
                vdotCorrectionFactor={analyticsMetrics.runalyzeMetrics.vdotCorrectionFactor}
                effectiveVo2maxCorrectionFactor={statsData?.effectiveVo2maxCorrectionFactor || 1.0}
                shapePercent={analyticsMetrics.runalyzeMetrics.shape}
                activities={activitiesData?.activities || []}
            />
        </>
    );
}
