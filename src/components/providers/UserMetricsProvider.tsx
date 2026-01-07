'use client';

import { createContext, useContext, ReactNode } from 'react';

interface UserMetrics {
    marathonShape: { shape: number };
    effectiveVO2max: number;
    correctionFactor: number;
    ctl: number;
    atl: number;
    tsb: number;
    workloadRatio: number;
    easyTrimp: number;
    currentWeekMileage: number;
    userHrMax: number;
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

export function UserMetricsProvider({ children, stats }: UserMetricsProviderProps) {
    // Extract defaults or fallback values
    const value: UserMetrics = {
        marathonShape: stats?.marathonShape || { shape: 0 },
        effectiveVO2max: stats?.effectiveVO2max || 0,
        correctionFactor: stats?.vdotCorrectionFactor || 1.0,
        ctl: stats?.ctl || 0,
        atl: stats?.atl || 0,
        tsb: stats?.tsb || 0,
        workloadRatio: stats?.workloadRatio || 0,
        easyTrimp: stats?.easyTrimp || 0,
        currentWeekMileage: stats?.currentWeekMileage || 0,
        userHrMax: stats?.hrMax || 185
    };

    return (
        <UserMetricsContext.Provider value={value}>
            {children}
        </UserMetricsContext.Provider>
    );
}
