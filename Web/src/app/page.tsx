'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { PullToRefresh } from '@/components';
import EditWorkoutModal from '@/components/EditWorkoutModal';
import DashboardView from '@/components/views/DashboardView';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [sessionTimedOut, setSessionTimedOut] = useState(false);
    const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const {
        statsData,
        recentActivities,
        activeGoal,
        incompleteGoal,
        weeklyWorkouts,
        syncStatus,
        syncMutation,
        isLoading,
        error,
        editingWorkout,
        initialComplete,
        openEditWorkout,
        closeEditWorkout,
        invalidateAll,
    } = useDashboardData({ status, userId: session?.user?.id });

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
        <PullToRefresh onRefresh={async () => { await invalidateAll(); }}>
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
                error={error}
                onEditWorkout={openEditWorkout}
                onInvalidateQueries={invalidateAll}
                showHeader={true}
            />

            <EditWorkoutModal
                key={editingWorkout?.id ?? 'new'}
                isOpen={!!editingWorkout}
                onClose={closeEditWorkout}
                workout={editingWorkout}
                goalId={activeGoal?.id}
                initialComplete={initialComplete}
            />
        </PullToRefresh>
    );
}
