'use client';

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Settings2 } from 'lucide-react';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import ShapeCalibrationModal from '@/components/ShapeCalibrationModal';
import {
    calculateWeightedEffectiveVO2max,
    calculateMarathonShape,
    calculatePredictedTimes,
    type ActivityForShape
} from '@/lib/metrics/runalyze';
import { formatTime } from '@/lib/metrics/vdot';

export default function AnalyticsPage() {
    const { status } = useSession();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);

    // Fetch ALL activities
    const { data: activitiesData, isLoading } = useQuery({
        queryKey: ['all-activities'],
        queryFn: async () => {
            const res = await fetch('/api/activities?limit=500');
            if (!res.ok) throw new Error('Failed to fetch activities');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    // Fetch user settings (for maxHR)
    const { data: userData } = useQuery({
        queryKey: ['user-settings'],
        queryFn: async () => {
            const res = await fetch('/api/user');
            if (!res.ok) throw new Error('Failed to fetch user');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    // Fetch active goal for calibration factor
    const { data: goalsData } = useQuery({
        queryKey: ['goals'],
        queryFn: async () => {
            const res = await fetch('/api/goals');
            if (!res.ok) throw new Error('Failed to fetch goals');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    // Recalculate mutation
    const recalculateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/settings/recalculate-vdot', { method: 'POST' });
            if (!res.ok) throw new Error('Failed to recalculate');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-activities'] });
        },
    });

    // Calculate Runalyze metrics
    const runalyzeMetrics = useMemo(() => {
        const activities = activitiesData?.activities || [];
        const runs: ActivityForShape[] = activities
            .filter((a: any) => a.type === 'RUN')
            .map((a: any) => ({
                startDate: a.startDate,
                distance: a.distance,
                movingTime: a.movingTime,
                averageHr: a.averageHr,
                hasHeartrate: a.hasHeartrate,
            }));

        const maxHR = userData?.user?.hrMax || 190;

        // Use active goal's calibration factor (default 1.0)
        const activeGoal = goalsData?.goals?.find((g: any) => g.isActive);
        const calibrationFactor = activeGoal?.marathonShapeFactor || 1.0;

        const effectiveVO2max = calculateWeightedEffectiveVO2max(runs, maxHR);
        const shapeResult = calculateMarathonShape(runs, effectiveVO2max);
        const times = calculatePredictedTimes(effectiveVO2max, shapeResult.shape, calibrationFactor);

        return {
            effectiveVO2max,
            shape: shapeResult.shape,
            mileageScore: shapeResult.mileageScore,
            longRunScore: shapeResult.longRunScore,
            details: shapeResult.details,
            optimalTime: times.optimal,
            predictedTime: times.predicted,
            calibrationFactor
        };
    }, [activitiesData, userData, goalsData]);

    if (status === 'loading' || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-gray-400">Loading analytics...</div>
            </div>
        );
    }

    if (status === 'unauthenticated') {
        router.push('/login');
        return null;
    }

    const activities = activitiesData?.activities || [];
    const runs = activities.filter((a: any) => a.type === 'RUN');
    const rides = activities.filter((a: any) => a.type === 'RIDE' || a.type === 'VIRTUAL_RIDE');
    const swims = activities.filter((a: any) => a.type === 'SWIM');

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-white/10 backdrop-blur-md bg-background/80 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.push('/')} className="p-2 text-gray-400 hover:text-white transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h1 className="text-xl font-bold text-white">Analytics</h1>
                        </div>
                        <button
                            onClick={() => recalculateMutation.mutate()}
                            disabled={recalculateMutation.isPending}
                            className="btn-secondary flex items-center gap-2 py-2 px-4"
                        >
                            <RefreshCw className={`w-4 h-4 ${recalculateMutation.isPending ? 'animate-spin' : ''}`} />
                            {recalculateMutation.isPending ? 'Recalculating...' : 'Recalculate'}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Runalyze-style Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Effective VO2max */}
                    <div className="glass-card p-6 text-center">
                        <p className="text-gray-400 text-sm mb-2">Effective VO2max</p>
                        <p className="text-4xl font-bold text-white">
                            {runalyzeMetrics.effectiveVO2max > 0 ? runalyzeMetrics.effectiveVO2max.toFixed(1) : '-'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Pace + Heart Rate based</p>
                    </div>

                    {/* Marathon Shape */}
                    <div className="glass-card p-6 text-center">
                        <p className="text-gray-400 text-sm mb-2">Marathon Shape</p>
                        <p className={`text-4xl font-bold ${runalyzeMetrics.shape >= 100 ? 'text-green-400' :
                                runalyzeMetrics.shape >= 70 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                            {runalyzeMetrics.shape}%
                        </p>
                        <div className="flex justify-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Mileage: {runalyzeMetrics.mileageScore}%</span>
                            <span>Long Runs: {runalyzeMetrics.longRunScore}%</span>
                        </div>
                    </div>

                    {/* Predictions + Calibration */}
                    <div className="glass-card p-6 text-center relative group">
                        <div className="absolute top-2 right-2">
                            <button
                                onClick={() => setIsCalibrationOpen(true)}
                                className="p-2 text-gray-500 hover:text-accent-pink transition-colors"
                                title="Calibrate Prediction"
                            >
                                <Settings2 className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-gray-400 text-sm mb-2">Marathon Prediction</p>
                        <div className="flex justify-center items-baseline gap-3">
                            <div>
                                <p className="text-xs text-gray-500">Optimal</p>
                                <p className="text-lg font-semibold text-green-400">
                                    {runalyzeMetrics.optimalTime > 0 ? formatTime(runalyzeMetrics.optimalTime) : '-'}
                                </p>
                            </div>
                            <span className="text-gray-600">→</span>
                            <div>
                                <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                                    Predicted
                                    {runalyzeMetrics.calibrationFactor !== 1.0 && (
                                        <span className="text-accent-blue text-[10px] bg-accent-blue/10 px-1 rounded">
                                            {runalyzeMetrics.calibrationFactor.toFixed(2)}x
                                        </span>
                                    )}
                                </p>
                                <p className="text-2xl font-bold text-white">
                                    {runalyzeMetrics.predictedTime > 0 ? formatTime(runalyzeMetrics.predictedTime) : '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Shape Details */}
                <div className="glass-card p-4 mb-8">
                    <div className="grid grid-cols-4 gap-4 text-center text-sm">
                        <div>
                            <p className="text-gray-500">Avg Weekly</p>
                            <p className="text-white font-semibold">{runalyzeMetrics.details.avgWeeklyKm} km</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Target Weekly</p>
                            <p className="text-white font-semibold">{runalyzeMetrics.details.targetWeeklyKm} km</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Long Run Points</p>
                            <p className="text-white font-semibold">{runalyzeMetrics.details.longRunPoints} / 10</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Activities</p>
                            <p className="text-white font-semibold">{runs.length} runs • {rides.length} rides • {swims.length} swims</p>
                        </div>
                    </div>
                </div>

                {/* Charts */}
                <AnalyticsDashboard
                    activities={runs}
                    currentVdot={runalyzeMetrics.effectiveVO2max}
                />
            </main>

            {/* Calibration Modal */}
            <ShapeCalibrationModal
                isOpen={isCalibrationOpen}
                onClose={() => setIsCalibrationOpen(false)}
                currentFactor={runalyzeMetrics.calibrationFactor}
                effectiveVO2max={runalyzeMetrics.effectiveVO2max}
                shapePercent={runalyzeMetrics.shape}
            />
        </div>
    );
}
