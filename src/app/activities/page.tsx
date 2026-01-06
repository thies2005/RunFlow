'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { ActivityList } from '@/components';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

export default function ActivitiesPage() {
    const { status } = useSession();
    const router = useRouter();
    const [filter, setFilter] = useState('RUN'); // Default to RUN

    const { data: activitiesData, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['activities', 'all', filter],
        queryFn: async () => {
            const typeParam = filter !== 'ALL' ? `&type=${filter}` : '';
            const res = await fetch(`/api/activities?limit=100${typeParam}`);
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center text-gray-400 hover:text-white transition-colors gap-2"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-2xl font-bold text-white">Activities</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Type Filter */}
                        <div className="flex bg-white/5 p-1 rounded-lg">
                            <button
                                onClick={() => setFilter('RUN')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'RUN' ? 'bg-accent-orange text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                Runs
                            </button>
                            <button
                                onClick={() => setFilter('RIDE')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'RIDE' ? 'bg-accent-orange text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                Rides
                            </button>
                            <button
                                onClick={() => setFilter('ALL')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'ALL' ? 'bg-accent-orange text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                All
                            </button>
                        </div>

                        <button
                            onClick={() => refetch()}
                            className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-white transition-colors"
                            disabled={isRefetching}
                        >
                            <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <p className="text-gray-400 mb-4 text-sm">
                        Showing last {activitiesData?.activities?.length || 0} {filter.toLowerCase() === 'all' ? 'activities' : filter.toLowerCase() + 's'}.
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
