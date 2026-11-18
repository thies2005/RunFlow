'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useStravaSync } from '@/hooks/useStravaSync';
import type { Workout, Goal, WorkoutWithLinkedActivity } from '@/lib/types';

export interface UseDashboardDataOptions {
    status: 'authenticated' | 'unauthenticated' | 'loading';
    userId?: string;
}

/**
 * Encapsulates the unified dashboard query, Strava sync state, derived goal/weekly
 * workout data, and workout editing modal state shared by desktop and mobile views.
 */
export function useDashboardData({ status, userId }: UseDashboardDataOptions) {
    const queryClient = useQueryClient();
    const [editingWorkout, setEditingWorkout] = useState<(Workout | WorkoutWithLinkedActivity) | null>(null);
    const [initialComplete, setInitialComplete] = useState(false);

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

    const { syncStatus, syncMutation } = useStravaSync(dashboardData?.syncStatus, userId);

    const openEditWorkout = useCallback((workout: Workout | WorkoutWithLinkedActivity, complete: boolean = false) => {
        setEditingWorkout(workout);
        setInitialComplete(complete);
    }, []);

    const closeEditWorkout = useCallback(() => {
        setEditingWorkout(null);
    }, []);

    const invalidateAll = useCallback(() => {
        return queryClient.invalidateQueries();
    }, [queryClient]);

    return {
        dashboardData,
        statsData,
        recentActivities,
        activeGoal,
        incompleteGoal,
        weeklyWorkouts,
        syncStatus,
        syncMutation,
        isLoading,
        error: error as Error | null,
        editingWorkout,
        initialComplete,
        openEditWorkout,
        closeEditWorkout,
        invalidateAll,
    };
}
