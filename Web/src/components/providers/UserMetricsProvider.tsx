'use client';

import { createContext, useContext, ReactNode } from 'react';

interface UserMetrics {
    marathonShape: {
        shape: number;
        mileageScore?: number;
        longRunScore?: number;
        crossTrainingScore?: number;
    };
    effectiveVO2max: number;
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
    const [maxMetrics, setMaxMetrics] = useState({ maxCtl: 100, maxAtl: 100 }); // Default to 100 to avoid division by zero/huge bars initially

    // Load max values from localStorage on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const saved = localStorage.getItem('runflow_fitness_max');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed.maxCtl === 'number' && typeof parsed.maxAtl === 'number') {
                    setMaxMetrics({
                        maxCtl: parsed.maxCtl || 100,
                        maxAtl: parsed.maxAtl || 100
                    });
                }
            }
        } catch (e) {
            console.error('Failed to load fitness max values', e);
        }
    }, []);

    // Update max values when stats change
    useEffect(() => {
        if (!stats) return;

        const currentCtl = stats.ctl || 0;
        const currentAtl = stats.atl || 0;

        // If newly fetched stats are higher than our stored max, update specific maxes
        setMaxMetrics(prev => {
            let changed = false;
            let newMaxCtl = prev.maxCtl;
            let newMaxAtl = prev.maxAtl;

            // Only update if current value is strictly greater
            if (currentCtl > prev.maxCtl) {
                newMaxCtl = currentCtl;
                changed = true;
            }
            if (currentAtl > prev.maxAtl) {
                newMaxAtl = currentAtl;
                changed = true;
            }

            if (changed) {
                const newMax = { maxCtl: newMaxCtl, maxAtl: newMaxAtl };
                localStorage.setItem('runflow_fitness_max', JSON.stringify(newMax));
                return newMax;
            }
            return prev;
        });
    }, [stats]); // stats object dependency

    // Extract defaults or fallback values
    const ctl = stats?.ctl || 0;
    const atl = stats?.atl || 0;

    const value: UserMetrics = {
        marathonShape: stats?.marathonShape || { shape: 0, mileageScore: 0, longRunScore: 0, crossTrainingScore: 0 },
        effectiveVO2max: stats?.effectiveVO2max || 0,
        correctionFactor: stats?.vdotCorrectionFactor || 1.0,
        ctl,
        atl,
        tsb: stats?.tsb || 0,
        workloadRatio: stats?.workloadRatio || 0,
        easyTrimp: stats?.easyTrimp || 0,
        currentWeekMileage: stats?.currentWeekMileage || 0,
        userHrMax: stats?.hrMax || 185,

        maxCtl: maxMetrics.maxCtl,
        maxAtl: maxMetrics.maxAtl,
        // Calculate percentages capped at 100% just in case, though logically if we update max it should match
        ctlPercent: maxMetrics.maxCtl > 0 ? (ctl / maxMetrics.maxCtl) * 100 : 0,
        atlPercent: maxMetrics.maxAtl > 0 ? (atl / maxMetrics.maxAtl) * 100 : 0
    };

    return (
        <UserMetricsContext.Provider value={value}>
            {children}
        </UserMetricsContext.Provider>
    );
}
