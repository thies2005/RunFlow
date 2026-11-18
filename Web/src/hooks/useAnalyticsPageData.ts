'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAnalyticsMetrics } from '@/hooks/useAnalyticsMetrics';
import type { TimeRange } from '@/components/CombinedAnalyticsChart';

export interface UseAnalyticsPageDataOptions {
    status: 'authenticated' | 'unauthenticated' | 'loading';
    /** Whether analytics queries should actively fetch (defaults to true; mobile layout gates by active tab). */
    enabled?: boolean;
}

/**
 * Encapsulates the 6 analytics queries, VDOT recalculation mutation, timeRange /
 * calibration modal state, and derived metrics for both desktop and mobile analytics views.
 */
export function useAnalyticsPageData({ status, enabled = true }: UseAnalyticsPageDataOptions) {
    const queryClient = useQueryClient();
    const [timeRange, setTimeRange] = useState<TimeRange>('1Y');
    const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);

    const isAuthedAndEnabled = status === 'authenticated' && enabled;

    const { data: activitiesData, isLoading } = useQuery({
        queryKey: ['all-activities'],
        staleTime: 0,
        refetchOnWindowFocus: true,
        queryFn: async () => {
            const res = await fetch('/api/activities?limit=500', { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to fetch activities');
            return res.json();
        },
        enabled: status === 'authenticated' && (enabled || isCalibrationOpen),
    });

    const { data: userData } = useQuery({
        queryKey: ['user-settings'],
        queryFn: async () => {
            const res = await fetch('/api/settings/update-vdot');
            if (!res.ok) throw new Error('Failed to fetch user settings');
            return res.json();
        },
        enabled: status === 'authenticated',
    });

    const { data: goalsData } = useQuery({
        queryKey: ['goals'],
        queryFn: async () => {
            const res = await fetch('/api/goals');
            if (!res.ok) throw new Error('Failed to fetch goals');
            return res.json();
        },
        enabled: isAuthedAndEnabled,
    });

    const { data: statsData } = useQuery({
        queryKey: ['analytics-stats'],
        queryFn: async () => {
            const res = await fetch('/api/analytics/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        },
        enabled: isAuthedAndEnabled,
    });

    const { data: historyData } = useQuery({
        queryKey: ['analytics-history', timeRange],
        queryFn: async () => {
            const rangeMap: Record<string, string> = {
                ALL: 'ALL',
                '1Y': '1_YEAR',
                '6M': '6_MONTHS',
                '3M': '12_WEEKS',
                '1M': '4_WEEKS',
            };
            const res = await fetch(`/api/analytics/history?range=${rangeMap[timeRange] || '1_YEAR'}`);
            if (!res.ok) throw new Error('Failed to fetch history');
            return res.json();
        },
        enabled: isAuthedAndEnabled,
    });

    const { data: cyclingData } = useQuery({
        queryKey: ['cycling-analytics', timeRange],
        queryFn: async () => {
            const rangeMap: Record<string, string> = {
                ALL: 'all',
                '1Y': '1y',
                '6M': '180d',
                '3M': '90d',
                '1M': '42d',
            };
            const res = await fetch(`/api/analytics/cycling?range=${rangeMap[timeRange] || '90d'}`);
            if (!res.ok) return null;
            return res.json();
        },
        enabled: isAuthedAndEnabled,
    });

    const recalculateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/settings/recalculate-vdot', { method: 'POST' });
            if (!res.ok) throw new Error('Failed to recalculate');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-activities'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-history'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
            queryClient.invalidateQueries({ queryKey: ['cycling-analytics'] });
        },
    });

    const analyticsMetrics = useAnalyticsMetrics(
        enabled ? activitiesData : undefined,
        enabled ? goalsData : undefined,
        enabled ? statsData : undefined,
        enabled ? historyData : undefined,
        enabled ? userData : undefined
    );

    return {
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
    };
}
