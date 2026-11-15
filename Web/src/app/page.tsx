'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { SettingsModal, PullToRefresh } from '@/components';
import EditWorkoutModal from '@/components/EditWorkoutModal';
import ProfileModal from '@/components/ProfileModal';
import DashboardView from '@/components/views/DashboardView';
import { useStravaSync } from '@/hooks/useStravaSync';
import type { Workout, Goal } from '@/lib/types';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
    const [initialComplete, setInitialComplete] = useState(false);
    const [sessionTimedOut, setSessionTimedOut] = useState(false);
    const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 1. Unified Dashboard Query
    const { data: dashboardData, isLoading, error } = useQuery({
        queryKey: ['dashboard-data'],
        // Workout links can change in the Android app while this view is idle.
        staleTime: 0,
        refetchOnWindowFocus: true,
        queryFn: async () => {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const res = await fetch(`/api/dashboard?date=${todayStr}`, { cache: 'no-store' });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to load dashboard');
            }
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    const statsData = dashboardData?.stats ?? null;
    const recentActivities = dashboardData?.recentActivities?.activities || [];
    const goalsList = dashboardData?.goals?.goals || [];
    const { syncStatus, syncMutation } = useStravaSync(dashboardData?.syncStatus, session?.user?.id);

    const activeGoal: Goal | undefined = goalsList.find((g: Goal) => g.isActive);
    const incompleteGoal: Goal | null = dashboardData?.incompleteGoal || null;
    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const allGoalWorkouts: Workout[] = activeGoal?.workouts || [];
    const weeklyWorkouts: Workout[] = allGoalWorkouts.filter((w) => {
        const d = new Date(w.scheduledDate);
        return d >= currentWeekStart && d <= currentWeekEnd;
    });

    useEffect(() => {
        if (status === 'loading') {
            sessionTimerRef.current = setTimeout(() => {
                setSessionTimedOut(true);
            }, 10000);
        }
        return () => {
            if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
        };
    }, [status]);

    if (status === 'loading' && !sessionTimedOut) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-foreground-muted">Loading...</div>
            </div>
        );
    }

    if (status === 'loading' && sessionTimedOut) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center max-w-md px-4">
                    <AlertCircle className="w-12 h-12 text-negative mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-foreground mb-2">Unable to load session</h2>
                    <p className="text-foreground-muted mb-4">The session check is taking too long. This may be a network or database issue.</p>
                    <button onClick={() => { setSessionTimedOut(false); }} className="btn-primary py-2 px-6">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'authenticated' && isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-foreground-muted">Loading dashboard...</div>
            </div>
        );
    }

    if (status === 'unauthenticated') {
        router.push('/login');
        return null;
    }

    return (
        <PullToRefresh onRefresh={async () => { await queryClient.invalidateQueries(); }}>
            <DashboardView
                session={session}
                statsData={statsData}
                recentActivities={recentActivities}
                activeGoal={activeGoal}
                incompleteGoal={incompleteGoal}
                weeklyWorkouts={weeklyWorkouts}
                syncStatus={syncStatus}
                syncMutation={syncMutation}
                isLoading={isLoading}
                error={error as Error | null}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenProfile={() => setIsProfileOpen(true)}
                onEditWorkout={(w, complete = false) => {
                    setEditingWorkout(w);
                    setInitialComplete(complete);
                }}
                onInvalidateQueries={() => queryClient.invalidateQueries()}
                showHeader={true}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            <EditWorkoutModal
                key={editingWorkout?.id ?? 'new'}
                isOpen={!!editingWorkout}
                onClose={() => setEditingWorkout(null)}
                workout={editingWorkout}
                goalId={activeGoal?.id}
                initialComplete={initialComplete}
            />

            <ProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
            />
        </PullToRefresh>
    );
}
