'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { RefreshCw, ArrowLeft, Plus } from 'lucide-react';
import { ActivityList, Footer, ErrorBoundary, PullToRefresh } from '@/components';
import { useSession } from 'next-auth/react';
import { useState, lazy, Suspense } from 'react';
import { AnalyticsStats, ActivitiesResponse } from '@/lib/types';

// Lazy load the modal component - only loads when opened
const ManualActivityModal = lazy(() => import('@/components/ManualActivityModal'));

export default function ActivitiesPage() {
    const { status } = useSession();
    const router = useRouter();
    const [filter, setFilter] = useState('RUN'); // Default to RUN
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);

    const { data: statsData } = useQuery<AnalyticsStats>({
        queryKey: ['analytics-stats'],
        queryFn: async () => {
            const res = await fetch('/api/analytics/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    const userHrMax = statsData?.hrMax || 185;

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        refetch,
        isRefetching
    } = useInfiniteQuery<ActivitiesResponse>({
        queryKey: ['activities', 'infinite', filter],
        queryFn: async ({ pageParam = 0 }) => {
            const param = pageParam as number;
            const typeParam = filter !== 'ALL' ? `&type=${filter}` : '';
            const res = await fetch(`/api/activities?limit=50&offset=${param}${typeParam}`);
            if (!res.ok) throw new Error('Failed to fetch activities');
            return res.json();
        },
        getNextPageParam: (lastPage) => {
            const nextOffset = lastPage.offset + lastPage.limit;
            if (nextOffset < lastPage.total) return nextOffset;
            return undefined;
        },
        initialPageParam: 0,
        enabled: status === 'authenticated',
    });

    const allActivities = data?.pages.flatMap((page) => page.activities) || [];
    const totalCount = data?.pages[0]?.total || 0;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-pulse text-foreground-muted">Loading...</div>
            </div>
        );
    }

    if (status === 'unauthenticated') {
        if (typeof window !== 'undefined') window.location.href = '/login';
        return null;
    }

    return (
        <ErrorBoundary componentName="Activities Page" showRetry>
            <div className="min-h-screen bg-background p-4 md:p-8">
                <PullToRefresh onRefresh={async () => { await refetch(); }}>
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => router.back()}
                                    className="flex items-center text-foreground-muted hover:text-foreground transition-colors gap-2"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <h1 className="text-2xl font-bold text-foreground">Activities</h1>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Type Filter */}
                                <div className="flex bg-surface p-1 rounded-lg border border-glass-border">
                                    <button
                                        onClick={() => setFilter('RUN')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'RUN' ? 'bg-accent-orange text-white shadow-lg' : 'text-foreground-muted hover:text-foreground'}`}
                                    >
                                        Runs
                                    </button>
                                    <button
                                        onClick={() => setFilter('RIDE')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'RIDE' ? 'bg-accent-orange text-white shadow-lg' : 'text-foreground-muted hover:text-foreground'}`}
                                    >
                                        Rides
                                    </button>
                                    <button
                                        onClick={() => setFilter('ALL')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'ALL' ? 'bg-accent-orange text-white shadow-lg' : 'text-foreground-muted hover:text-foreground'}`}
                                    >
                                        All
                                    </button>
                                </div>

                                <button
                                    onClick={() => setIsManualModalOpen(true)}
                                    className="btn-primary flex items-center gap-2 py-2 px-4 shadow-lg shadow-blue-500/20"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">Manual Entry</span>
                                </button>

                                <button
                                    onClick={() => refetch()}
                                    className="p-2 bg-surface hover:bg-surface-hover text-foreground transition-colors border border-glass-border rounded-lg"
                                    disabled={isRefetching}
                                >
                                    <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <div className="glass-card p-6">
                            <p className="text-foreground-muted mb-4 text-sm">
                                Showing {allActivities.length} of {totalCount} {filter.toLowerCase() === 'all' ? 'activities' : filter.toLowerCase() + 's'}.
                            </p>
                            <ActivityList
                                activities={allActivities}
                                isLoading={isLoading}
                                userHrMax={userHrMax}
                                vdotCorrectionFactor={statsData?.vdotCorrectionFactor}
                            />

                            {hasNextPage && (
                                <div className="mt-8 flex justify-center">
                                    <button
                                        onClick={() => fetchNextPage()}
                                        disabled={isFetchingNextPage}
                                        className="px-6 py-2 bg-surface hover:bg-surface-hover text-foreground rounded-lg transition-colors flex items-center gap-2 border border-glass-border"
                                    >
                                        {isFetchingNextPage ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Loading...
                                            </>
                                        ) : (
                                            'Load More'
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </PullToRefresh>

                <Suspense fallback={null}>
                    <ManualActivityModal
                        isOpen={isManualModalOpen}
                        onClose={() => setIsManualModalOpen(false)}
                    />
                </Suspense>
                <Footer />
            </div>
        </ErrorBoundary>
    );
}
