'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface UnitContextType {
    useImperial: boolean;
    isLoading: boolean;
}

const UnitContext = createContext<UnitContextType>({
    useImperial: false,
    isLoading: true,
});

export function UnitProvider({ children }: { children: ReactNode }) {
    const { data: settings, isLoading: isQueryLoading } = useQuery({
        queryKey: ['user-settings'],
        queryFn: async () => {
            const res = await fetch('/api/settings/update-vdot');
            if (!res.ok) throw new Error('Failed to fetch settings');
            return res.json();
        },
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    // Local state to handle immediate storage sync and avoid flash if possible
    const [useImperial, setUseImperial] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load from local storage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('runflow-units');
            if (saved) {
                setUseImperial(saved === 'imperial');
            }
        } catch (e) {
            console.error('Failed to read units from local storage', e);
        } finally {
            setIsInitialized(true);
        }
    }, []);

    // Sync from server settings when available
    useEffect(() => {
        if (settings?.useImperial !== undefined) {
            setUseImperial(settings.useImperial);
            try {
                localStorage.setItem('runflow-units', settings.useImperial ? 'imperial' : 'metric');
            } catch (e) {
                // Ignore storage errors
            }
        }
    }, [settings]);

    // Safe access to local storage
    const getStoredUnit = () => {
        if (typeof window === 'undefined') return null;
        try {
            return localStorage.getItem('runflow-units');
        } catch {
            return null;
        }
    };

    const value: UnitContextType = {
        useImperial,
        isLoading: !isInitialized || (isQueryLoading && !getStoredUnit()),
    };

    return React.createElement(
        UnitContext.Provider,
        { value },
        children
    );
}

export function useUnits(): UnitContextType {
    return useContext(UnitContext);
}

// Conversion constants
const KM_TO_MILES = 0.621371;
const METERS_TO_FEET = 3.28084;

/**
 * Format distance in meters to km or miles based on unit preference
 */
export function formatDistance(
    meters: number | null | undefined,
    useImperial: boolean,
    decimals: number = 2
): string {
    if (meters === null || meters === undefined || meters < 0) return '0';

    if (useImperial) {
        return ((meters / 1000) * KM_TO_MILES).toFixed(decimals);
    }
    return (meters / 1000).toFixed(decimals);
}

/**
 * Format distance with unit suffix
 */
export function formatDistanceWithUnit(
    meters: number | null | undefined,
    useImperial: boolean,
    decimals: number = 2
): string {
    const unit = useImperial ? 'mi' : 'km';
    return `${formatDistance(meters, useImperial, decimals)} ${unit}`;
}

/**
 * Format pace in seconds per km to M:SS/km or M:SS/mi string
 */
export function formatPace(
    secondsPerKm: number | null | undefined,
    useImperial: boolean
): string {
    if (secondsPerKm === null || secondsPerKm === undefined || secondsPerKm <= 0) return '--:--';

    let paceValue = secondsPerKm;
    const unit = useImperial ? '/mi' : '/km';

    if (useImperial) {
        paceValue = secondsPerKm / KM_TO_MILES;
    }

    const mins = Math.floor(paceValue / 60);
    const secs = Math.round(paceValue % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}${unit}`;
}

/**
 * Format speed in m/s to pace string (M:SS/km or M:SS/mi)
 */
export function formatSpeedAsPace(
    speedMs: number | null | undefined,
    useImperial: boolean
): string {
    if (speedMs === null || speedMs === undefined || speedMs <= 0) return '--:--';

    const paceSecsPerKm = 1000 / speedMs;
    return formatPace(paceSecsPerKm, useImperial);
}

/**
 * Get the unit label for distance
 */
export function getDistanceUnit(useImperial: boolean): string {
    return useImperial ? 'mi' : 'km';
}

/**
 * Get the unit label for pace
 */
export function getPaceUnit(useImperial: boolean): string {
    return useImperial ? '/mi' : '/km';
}

/**
 * Format elevation in meters to meters or feet based on unit preference
 */
export function formatElevation(
    meters: number | null | undefined,
    useImperial: boolean,
    decimals: number = 0
): string {
    if (meters === null || meters === undefined) return '0';

    if (useImperial) {
        return (meters * METERS_TO_FEET).toFixed(decimals);
    }
    return meters.toFixed(decimals);
}

/**
 * Get the unit label for elevation
 */
export function getElevationUnit(useImperial: boolean): string {
    return useImperial ? 'ft' : 'm';
}

/**
 * Format elevation with unit suffix
 */
export function formatElevationWithUnit(
    meters: number | null | undefined,
    useImperial: boolean,
    decimals: number = 0
): string {
    const unit = getElevationUnit(useImperial);
    return `${formatElevation(meters, useImperial, decimals)} ${unit}`;
}
