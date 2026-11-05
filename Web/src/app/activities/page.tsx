'use client';

import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
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
    const queryClient = useQueryClient();
    const [source, setSource] = useState('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
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
        queryKey: ['activities', 'infinite', filter, source],
        queryFn: async ({ pageParam = 0 }) => {
            const param = pageParam as number;
            const typeParam = filter !== 'ALL' ? `&type=${filter}` : '';
            const res = await fetch(`/api/activities?limit=50&offset=${param}${typeParam}&source=${source}`, { cache: 'no-store' });
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
    const changeFilter = (value: string) => { setFilter(value); setSelectedIds(new Set()); };
    const deleteSelected = async () => {
        if (selectedIds.size > 1000) {
            setDeleteError('Select at most 1,000 activities at a time.');
            return;
        }
        if (!selectedIds.size || !window.confirm(`Delete ${selectedIds.size} selected ${selectedIds.size === 1 ? 'activity' : 'activities'} from RunFlow? Linked workouts will be unlinked. Imported activities may return on a future sync.`)) return;
        setDeleting(true);
        setDeleteError('');
        try {
            const res = await fetch('/api/activities', {
                method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: Array.from(selectedIds) }),
            });
            if (!res.ok) throw new Error('Could not delete the selected activities. Please try again.');
            setSelectedIds(new Set());
            await Promise.all(['activities', 'dashboard', 'analytics-stats', 'plan', 'plans', 'plan-advanced'].map(key => queryClient.invalidateQueries({ queryKey: [key] })));
        } catch (error) {
            setDeleteError(error instanceof Error ? error.message : 'Could not delete the selected activities.');
        } finally { setDeleting(false); }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-foreground-muted">Loading...</div>
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
                                <div className="flex bg-surface p-1 rounded-md border border-line">
                                    <button
                                        disabled={deleting}
                                        onClick={() => changeFilter('RUN')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'RUN' ? 'bg-accent-orange text-white' : 'text-foreground-muted hover:text-foreground'}`}
                                    >
                                        Runs
                                    </button>
                                    <button
                                        disabled={deleting}
                                        onClick={() => changeFilter('RIDE')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'RIDE' ? 'bg-accent-orange text-white' : 'text-foreground-muted hover:text-foreground'}`}
                                    >
                                        Rides
                                    </button>
                                    <button
                                        disabled={deleting}
                                        onClick={() => changeFilter('ALL')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'ALL' ? 'bg-accent-orange text-white' : 'text-foreground-muted hover:text-foreground'}`}
                                    >
                                        All
                                    </button>
                                </div>

                                <button
                                    onClick={() => setIsManualModalOpen(true)}
                                    className="btn-primary flex items-center gap-2 py-2 px-4"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">Manual Entry</span>
                                </button>

                                <button
                                    onClick={() => refetch()}
                                    className="p-2 bg-surface hover:bg-surface-hover text-foreground transition-colors border border-line rounded-md"
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
                            <div className="flex flex-wrap items-center gap-4 mb-4">
                                <label className="text-sm text-foreground" htmlFor="activity-source">Source</label>
                                <select id="activity-source" disabled={deleting} value={source} onChange={event => { setSource(event.target.value); setSelectedIds(new Set()); }} className="bg-surface text-foreground border border-line rounded-md p-2">
                                    <option value="all">All sources</option>
                                    <option value="strava">Strava</option>
                                    <option value="runflow">RunFlow entries and uploads</option>
                                </select>
                                <label className="flex items-center gap-2 text-sm text-foreground">
                                    <input type="checkbox" checked={allActivities.length > 0 && allActivities.every(a => selectedIds.has(a.id))}
                                        onChange={event => setSelectedIds(event.target.checked ? new Set(allActivities.map(a => a.id)) : new Set())}
                                        disabled={!allActivities.length || deleting} /> Select loaded activities
                                </label>
                                <button type="button" onClick={deleteSelected} disabled={!selectedIds.size || deleting}
                                    className="px-3 py-2 border border-line rounded-md text-foreground disabled:opacity-50">
                                    {deleting ? 'Deleting…' : `Delete selected (${selectedIds.size})`}
                                </button>
                            </div>
                            {deleteError && <p role="alert" className="text-red-500 mb-4">{deleteError}</p>}
                            <ActivityList
                                selectionDisabled={deleting}
                                selectedIds={selectedIds}
                                onSelectionChange={(id, selected) => setSelectedIds(previous => {
                                    const next = new Set(previous);
                                    if (selected) next.add(id); else next.delete(id);
                                    return next;
                                })}
                                activities={allActivities}
                                isLoading={isLoading}
                                userHrMax={userHrMax}
                                vdotCorrectionFactor={statsData?.vdotCorrectionFactor}
                            />

                            {hasNextPage && (
                                <div className="mt-8 flex justify-center">
                                    <button
                                        onClick={() => fetchNextPage()}
                                        disabled={isFetchingNextPage || deleting}
                                        className="px-6 py-2 bg-surface hover:bg-surface-hover text-foreground rounded-md transition-colors flex items-center gap-2 border border-line"
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
