/**
 * Strava Fitness Metrics Module
 * 
 * Handles fitness calculations and cache updates:
 * - CTL/ATL/TSB calculations
 * - Daily fitness cache updates
 * - Fitness metrics aggregation
 */

import { updateFitnessCache } from '@/lib/metrics/fitnessCache';

export interface ModifiedActivity {
    startDate: Date;
}

export async function calculateAndSaveFitnessMetrics(
    userId: string,
    modifiedActivities: ModifiedActivity[]
): Promise<void> {
    if (modifiedActivities.length > 0) {
        await updateFitnessCache(userId, modifiedActivities);
    }
}

export async function updateDailyFitnessCache(
    userId: string,
    modifiedActivities: ModifiedActivity[]
): Promise<void> {
    await updateFitnessCache(userId, modifiedActivities);
}
