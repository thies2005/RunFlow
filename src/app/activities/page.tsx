'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { ActivityList } from '@/components';
import { useSession } from 'next-auth/react';

export default function ActivitiesPage() {
    const { status } = useSession();
    const router = useRouter();

    const { data: activitiesData, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['activities', 'all'],
        queryFn: async () => {
            const res = await fetch('/api/activities?limit=100&type=RUN');
            if (!res.ok) throw new Error('Failed to fetch activities');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-pulse text-gray-500">Loading...</div>
            </div>
        );
    }

    if (status === 'unauthenticated') {
        if (typeof window !== 'undefined') window.location.href = '/login';
        return null;
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-gray-400 hover:text-white transition-colors gap-2"
                    >
                        <ArrowLeft className="w-5 h-5" /> Back
                    </button>
                    <h1 className="text-2xl font-bold text-white">All Activities</h1>
                    <button
                        onClick={() => refetch()}
                        className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-white transition-colors"
                        disabled={isRefetching}
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="glass-card p-6">
                    <p className="text-gray-400 mb-4">
                        Showing last {activitiesData?.activities?.length || 0} runs.
                    </p>
                    <ActivityList
                        activities={activitiesData?.activities || []}
                        isLoading={isLoading}
                    />
                </div>
            </div>
        </div>
    );
}
