'use client';

import { createContext, useContext, ReactNode } from 'react';

interface UserMetrics {
    marathonShape: {
        shape: number;
        mileageScore?: number;
        longRunScore?: number;
        crossTrainingScore?: number;
    };
    /**
     * Performance VDOT (best effort from recent runs). Drives plan creation,
     * progression, workout paces and race projections.
     */
    vdot: number;
    /**
     * Aerobic Fitness (VO2max) — HR-based trend indicator. Display/trend only;
     * NEVER feeds paces or planning.
     */
    aerobicVo2max: number;
    cyclingVo2max: number;
    activeFtpWatts: number;
    correctionFactor: number;
    ctl: number;
    atl: number;
    tsb: number;
    workloadRatio: number;
    easyTrimp: number;
    currentWeekMileage: number;
    userHrMax: number;
    // New fields for percentage display
    maxCtl: number;
    maxAtl: number;
    ctlPercent: number;
    atlPercent: number;
}

const UserMetricsContext = createContext<UserMetrics | null>(null);

export function useUserMetrics() {
    const context = useContext(UserMetricsContext);
    if (!context) {
        throw new Error('useUserMetrics must be used within a UserMetricsProvider');
    }
    return context;
}

interface UserMetricsProviderProps {
    children: ReactNode;
    stats?: any; // Using any loosely here for flexibility with API response, or define strict type
}

import { useState, useEffect } from 'react';

export function UserMetricsProvider({ children, stats }: UserMetricsProviderProps) {
    // Initial max values: check stats first, otherwise default to 100
    const [maxMetrics, setMaxMetrics] = useState({
        maxCtl: stats?.maxCtl || 100,
        maxAtl: stats?.maxAtl || 100
    });

    // Effect: If stats change and contain explicit max values (from newly updated API), update state
    useEffect(() => {
        if (!stats) return;

        // Trust server-provided max values if they exist
        if (typeof stats.maxCtl === 'number' && typeof stats.maxAtl === 'number') {
            setMaxMetrics({
                maxCtl: stats.maxCtl > 0 ? stats.maxCtl : 100,
                maxAtl: stats.maxAtl > 0 ? stats.maxAtl : 100
            });
            return;
        }

        // --- Fallback logic (Client-side tracking for older API responses) ---
        // Only run this if the server DIDN'T provide max values
        const currentCtl = stats.ctl || 0;
        const currentAtl = stats.atl || 0;

        setMaxMetrics(prev => {
            let changed = false;
            let newMaxCtl = prev.maxCtl;
            let newMaxAtl = prev.maxAtl;

            if (currentCtl > prev.maxCtl) {
                newMaxCtl = currentCtl;
                changed = true;
            }
            if (currentAtl > prev.maxAtl) {
                newMaxAtl = currentAtl;
                changed = true;
            }

            if (changed) {
                return { maxCtl: newMaxCtl, maxAtl: newMaxAtl };
            }
            return prev;
        });
    }, [stats]);

    // Extract defaults or fallback values
    const ctl = stats?.ctl || 0;
    const atl = stats?.atl || 0;

    // Use state max values (which are now synced with server stats)
    const effectiveMaxCtl = maxMetrics.maxCtl;
    const effectiveMaxAtl = maxMetrics.maxAtl;

    const value: UserMetrics = {
        marathonShape: stats?.marathonShape || { shape: 0, mileageScore: 0, longRunScore: 0, crossTrainingScore: 0 },
        // Two-metric contract: `vdot` is the performance VDOT (planning + paces),
        // `aerobicVo2max` is the HR-based aerobic-fitness trend (display only).
        vdot: stats?.vdot || 0,
        aerobicVo2max: stats?.effectiveVO2max || 0,
        cyclingVo2max: stats?.cyclingVo2max || 0,
        activeFtpWatts: stats?.activeFtpWatts || 0,
        correctionFactor: stats?.vdotCorrectionFactor || 1.0,
        ctl,
        atl,
        tsb: stats?.tsb || 0,
        workloadRatio: stats?.workloadRatio || 0,
        easyTrimp: stats?.easyTrimp || 0,
        currentWeekMileage: stats?.currentWeekMileage || 0,
        userHrMax: stats?.hrMax || 185,

        maxCtl: effectiveMaxCtl,
        maxAtl: effectiveMaxAtl,
        // Calculate percentages
        ctlPercent: effectiveMaxCtl > 0 ? (ctl / effectiveMaxCtl) * 100 : 0,
        atlPercent: effectiveMaxAtl > 0 ? (atl / effectiveMaxAtl) * 100 : 0
    };

    return (
        <UserMetricsContext.Provider value={value}>
            {children}
        </UserMetricsContext.Provider>
    );
}
