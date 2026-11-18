'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import AnalyticsView from '@/components/views/AnalyticsView';
import { useAnalyticsPageData } from '@/hooks/useAnalyticsPageData';

const ShapeCalibrationModal = dynamic(() => import('@/components/ShapeCalibrationModal'), { ssr: false });

export default function AnalyticsPage() {
    const { status } = useSession();
    const router = useRouter();

    const {
        activitiesData,
        userData,
        statsData,
        cyclingData,
        isLoading,
        timeRange,
        setTimeRange,
        isCalibrationOpen,
        setIsCalibrationOpen,
        recalculateMutation,
        analyticsMetrics,
    } = useAnalyticsPageData({ status });

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
                setTimeRange={setTimeRange}
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
