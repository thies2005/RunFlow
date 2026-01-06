'use client';

import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, TrendingUp } from 'lucide-react';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

export default function AnalyticsPage() {
    const { status } = useSession();
    const router = useRouter();
    const queryClient = useQueryClient();

    // Fetch ALL activities (runs, rides, swims)
    const { data: activitiesData, isLoading } = useQuery({
        queryKey: ['all-activities'],
        queryFn: async () => {
            const res = await fetch('/api/activities?limit=500');
            if (!res.ok) throw new Error('Failed to fetch activities');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    // Fetch goals for VDOT
    const { data: goalsData } = useQuery({
        queryKey: ['goals'],
        queryFn: async () => {
            const res = await fetch('/api/goals');
            if (!res.ok) throw new Error('Failed to fetch goals');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    // Recalculate VDOT mutation
    const recalculateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/settings/recalculate-vdot', { method: 'POST' });
            if (!res.ok) throw new Error('Failed to recalculate');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goals'] });
        },
    });

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

    const activeGoal = goalsData?.goals?.find((g: any) => g.isActive);
    const currentVdot = activeGoal?.currentVdot || null;
    const activities = activitiesData?.activities || [];

    // Split by type
    const runs = activities.filter((a: any) => a.type === 'RUN');
    const rides = activities.filter((a: any) => a.type === 'RIDE' || a.type === 'VIRTUAL_RIDE');
    const swims = activities.filter((a: any) => a.type === 'SWIM');

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-white/10 backdrop-blur-md bg-background/80 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push('/')}
                                className="p-2 text-gray-400 hover:text-white transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h1 className="text-xl font-bold text-white">Analytics</h1>
                        </div>

                        {/* Recalculate VDOT button */}
                        <button
                            onClick={() => recalculateMutation.mutate()}
                            disabled={recalculateMutation.isPending}
                            className="btn-secondary flex items-center gap-2 py-2 px-4"
                        >
                            <RefreshCw className={`w-4 h-4 ${recalculateMutation.isPending ? 'animate-spin' : ''}`} />
                            {recalculateMutation.isPending ? 'Recalculating...' : 'Recalculate VDOT'}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* VDOT Status */}
                {recalculateMutation.isSuccess && (
                    <div className="mb-6 p-4 glass-card bg-green-500/10 border-green-500/20">
                        <p className="text-green-400">
                            ✅ VDOT recalculated: <strong>{recalculateMutation.data?.vdot?.toFixed(1)}</strong>
                        </p>
                    </div>
                )}

                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <div className="glass-card p-4 text-center">
                        <p className="text-gray-400 text-xs mb-1">Current VDOT</p>
                        <p className="text-2xl font-bold text-white">
                            {currentVdot && currentVdot > 0 ? currentVdot.toFixed(1) : '-'}
                        </p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-gray-400 text-xs mb-1">Total Runs</p>
                        <p className="text-2xl font-bold text-white">{runs.length}</p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-gray-400 text-xs mb-1">Run Distance</p>
                        <p className="text-2xl font-bold text-white">
                            {Math.round(runs.reduce((s: number, a: any) => s + a.distance, 0) / 1000)} km
                        </p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-gray-400 text-xs mb-1">Bike Time</p>
                        <p className="text-2xl font-bold text-white">
                            {Math.round(rides.reduce((s: number, a: any) => s + a.movingTime, 0) / 3600)}h
                        </p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-gray-400 text-xs mb-1">Swims</p>
                        <p className="text-2xl font-bold text-white">{swims.length}</p>
                    </div>
                </div>

                {/* Main Analytics Dashboard */}
                <AnalyticsDashboard
                    activities={runs}
                    currentVdot={currentVdot}
                />
            </main>
        </div>
    );
}
