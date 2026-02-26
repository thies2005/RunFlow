import { Capacitor } from '@capacitor/core';
import { Health, HealthDataType, WorkoutType } from '@capgo/capacitor-health';
import { logger } from '@/lib/logging/logger';

export const isMobile = () => Capacitor.isNativePlatform();

// Data types we request permission for
const REQUIRED_READ_PERMISSIONS: HealthDataType[] = [
    'distance',
    'heartRate',
    'steps',
    'calories',
    'weight'
];

// Map plugin workout types to RunFlow activity types
const WORKOUT_TYPE_MAP: Record<WorkoutType, string> = {
    'running': 'RUN',
    'walking': 'WALK',
    'hiking': 'HIKE',
    'cycling': 'RIDE',
    'swimming': 'SWIM',
    'yoga': 'WORKOUT',
    'strengthTraining': 'WORKOUT',
    'tennis': 'WORKOUT',
    'basketball': 'WORKOUT',
    'soccer': 'WORKOUT',
    'americanFootball': 'WORKOUT',
    'baseball': 'WORKOUT',
    'crossTraining': 'WORKOUT',
    'elliptical': 'WORKOUT',
    'rowing': 'WORKOUT',
    'stairClimbing': 'WORKOUT',
    'traditionalStrengthTraining': 'WORKOUT',
    'waterFitness': 'SWIM',
    'waterPolo': 'SWIM',
    'waterSports': 'SWIM',
    'wrestling': 'WORKOUT',
    'other': 'OTHER',
};

export interface HealthActivity {
    name: string;
    type: string;
    startDate: Date;
    endDate: Date;
    distance?: number; // meters
    duration: number; // seconds
    calories?: number;
    averageHr?: number; // bpm
    hrZones?: {
        z1: number;
        z2: number;
        z3: number;
        z4: number;
        z5: number;
        z6: number;
        z7: number;
    };
}

export interface ZoneSettings {
    z1: number;
    z2: number;
    z3: number;
    z4: number;
    z5: number;
    z6: number;
}

/**
 * Check if Health Connect is available on this device
 */
export async function isHealthConnectAvailable(): Promise<boolean> {
    if (!isMobile()) return false;

    try {
        const result = await Health.isAvailable();
        return result.available;
    } catch (error) {
        logger.error('Health Connect availability check failed', { error });
        return false;
    }
}

/**
 * Request permissions for Health Connect
 * Note: Workout/Exercise permissions must be granted through Health Connect settings
 */
export async function requestHealthPermissions(): Promise<boolean> {
    if (!isMobile()) return false;

    try {
        // First request the basic data type permissions the plugin supports
        await Health.requestAuthorization({
            read: REQUIRED_READ_PERMISSIONS,
            write: ['weight'],
        });

        // Open Health Connect settings so user can grant Workouts/Exercise permission
        // The plugin's requestAuthorization doesn't support workout permissions directly,
        // so the user must grant READ_EXERCISE through the Health Connect app settings
        await Health.openHealthConnectSettings();

        // We return true to indicate settings were opened
        // The actual permission check happens when we try to query workouts
        return true;
    } catch (error) {
        logger.error('Health Connect Permission Error', { error });
        return false;
    }
}

/**
 * Get average heart rate for a given time window
 */
async function getAverageHeartRate(startDate: Date, endDate: Date): Promise<number | undefined> {
    try {
        const result = await Health.readSamples({
            dataType: 'heartRate',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            limit: 500, // Get up to 500 HR samples
        });

        if (!result.samples || result.samples.length === 0) {
            return undefined;
        }

        // Calculate average heart rate
        const totalHr = result.samples.reduce((sum, sample) => sum + sample.value, 0);
        const averageHr = Math.round(totalHr / result.samples.length);

        return averageHr;
    } catch (error) {
        logger.error('Failed to get heart rate data', { error });
        return undefined;
    }
}

/**
 * Calculate time in zones from HR samples
 */
async function getHeartRateZones(
    startDate: Date,
    endDate: Date,
    settings?: ZoneSettings
): Promise<HealthActivity['hrZones'] | undefined> {
    try {
        const result = await Health.readSamples({
            dataType: 'heartRate',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            limit: 500,
        });

        if (!result.samples || result.samples.length === 0) {
            return undefined;
        }

        const zones = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, z6: 0, z7: 0 };
        const thresholds = settings || { z1: 130, z2: 148, z3: 160, z4: 170, z5: 178, z6: 187 };

        // Sort samples by date
        const sortedSamples = [...result.samples].sort((a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );

        for (let i = 0; i < sortedSamples.length; i++) {
            const sample = sortedSamples[i];
            const hr = sample.value;

            // Calculate duration (seconds between samples)
            let duration = 0;
            if (i < sortedSamples.length - 1) {
                const nextSample = sortedSamples[i + 1];
                duration = (new Date(nextSample.startDate).getTime() - new Date(sample.startDate).getTime()) / 1000;
                // Cap at 30s to avoid skewing for gaps
                duration = Math.min(duration, 30);
            } else {
                // Last sample - use 1s
                duration = 1;
            }

            if (hr <= thresholds.z1) zones.z1 += duration;
            else if (hr <= thresholds.z2) zones.z2 += duration;
            else if (hr <= thresholds.z3) zones.z3 += duration;
            else if (hr <= thresholds.z4) zones.z4 += duration;
            else if (hr <= thresholds.z5) zones.z5 += duration;
            else if (hr <= thresholds.z6) zones.z6 += duration;
            else zones.z7 += duration;
        }

        return {
            z1: Math.round(zones.z1),
            z2: Math.round(zones.z2),
            z3: Math.round(zones.z3),
            z4: Math.round(zones.z4),
            z5: Math.round(zones.z5),
            z6: Math.round(zones.z6),
            z7: Math.round(zones.z7),
        };
    } catch (error) {
        logger.error('Failed to calculate HR zones', { error });
        return undefined;
    }
}

/**
 * Fetch workout activities from Health Connect
 */
export async function fetchHealthActivities(days = 30, settings?: ZoneSettings): Promise<HealthActivity[]> {
    if (!isMobile()) return [];

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    try {
        // Query all workout sessions using the dedicated queryWorkouts method
        const result = await Health.queryWorkouts({
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            limit: 200,
        });

        if (!result.workouts || result.workouts.length === 0) {
            logger.info('No workouts found in Health Connect');
            return [];
        }

        const activities: HealthActivity[] = [];

        for (const workout of result.workouts) {
            // Map workout type to RunFlow type
            const runflowType = WORKOUT_TYPE_MAP[workout.workoutType] || 'OTHER';

            // Skip very short activities (less than 1 minute)
            if (workout.duration < 60) continue;

            const startDate = new Date(workout.startDate);
            const endDate = new Date(workout.endDate);

            // Generate a descriptive name
            const workoutName = workout.sourceName ||
                `${workout.workoutType.charAt(0).toUpperCase() + workout.workoutType.slice(1)} Activity`;

            // Fetch average heart rate and zones
            const averageHr = await getAverageHeartRate(startDate, endDate);
            const hrZones = await getHeartRateZones(startDate, endDate, settings);

            activities.push({
                name: workoutName,
                type: runflowType,
                startDate,
                endDate,
                distance: workout.totalDistance || undefined,
                duration: workout.duration,
                calories: workout.totalEnergyBurned || undefined,
                averageHr,
                hrZones,
            });
        }

        return activities;
    } catch (error) {
        logger.error('Failed to fetch Health Connect activities', { error });
        return [];
    }
}

/**
 * Sync Health Connect activities to RunFlow API
 * Returns number of activities synced (excluding duplicates)
 */
export async function syncHealthData(
    days = 30,
    settings?: ZoneSettings
): Promise<{ synced: number; errors: number; skipped: number }> {
    if (!isMobile()) {
        return { synced: 0, errors: 0, skipped: 0 };
    }

    const activities = await fetchHealthActivities(days, settings);
    let synced = 0;
    let errors = 0;
    let skipped = 0;

    logger.info(`Found ${activities.length} activities in Health Connect`);

    for (const activity of activities) {
        try {
            const response = await fetch('/api/activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: activity.name,
                    date: activity.startDate.toISOString(),
                    type: activity.type,
                    distance: activity.distance ? activity.distance / 1000 : 0, // API expects km
                    duration: Math.round(activity.duration / 60), // API expects minutes
                    hr: activity.averageHr, // Include heart rate if available
                    hrZones: activity.hrZones, // Include zone breakdown
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.duplicate) {
                    skipped++;
                } else {
                    synced++;
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                logger.error('Failed to sync activity', { name: activity.name, error: errorData });
                errors++;
            }
        } catch (error) {
            logger.error('Error syncing activity', { name: activity.name, error });
            errors++;
        }
    }

    logger.info('Health Connect sync complete', { synced, skipped, errors });
    return { synced, errors, skipped };
}

/**
 * Deduplicate health samples by source.
 * Different apps (e.g. Google Fit, Samsung Health, Watch apps) often report
 * overlapping data. By grouping samples by their source app and taking the
 * maximum total from any single source, we prevent double-counting and
 * effectively trust the tracker that recorded the most activity for the day.
 */
function deduplicateSamples(samples: any[]): number {
    if (!samples || samples.length === 0) return 0;

    // Group sample sums by their source (e.g., 'com.google.android.apps.fitness')
    const sourceTotals = new Map<string, number>();

    for (const sample of samples) {
        // Fallback to 'unknown' if no source is provided so we don't lose data
        const source = sample.sourceName || sample.sourceId || 'unknown_source';
        const currentTotal = sourceTotals.get(source) || 0;
        sourceTotals.set(source, currentTotal + sample.value);
    }

    // Find the maximum total across all sources
    let maxTotal = 0;
    sourceTotals.forEach(total => {
        if (total > maxTotal) {
            maxTotal = total;
        }
    });

    return maxTotal;
}

/**
 * Fetch steps and weight for a single day, and sync to backend
 */
export async function syncDailyHealth(date: Date = new Date()): Promise<void> {
    if (!isMobile()) return;

    // Use midnight to midnight (UTC) for the target date to align with backend
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 1);

    try {
        const [stepsResult, weightResult] = await Promise.all([
            Health.readSamples({
                dataType: 'steps',
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                limit: 1000,
            }),
            Health.readSamples({
                dataType: 'weight',
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                limit: 1, // Only care about latest weight for the day
            })
        ]);

        let totalSteps = 0;
        if (stepsResult.samples) {
            totalSteps = deduplicateSamples(stepsResult.samples);
        }

        let weightKg: number | undefined;
        if (weightResult.samples && weightResult.samples.length > 0) {
            // Take the most recent weight
            const sortedWeights = [...weightResult.samples].sort(
                (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
            );
            weightKg = sortedWeights[0].value;
        }

        // Post to backend
        await fetch('/api/health/daily', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: start.toISOString(),
                action: 'updateHealth',
                steps: totalSteps > 0 ? totalSteps : undefined,
                weight: weightKg
            }),
        });
    } catch (error) {
        logger.error('Failed to sync daily health', { error });
    }
}

/**
 * Sync the last N days of health data (steps, weight)
 * Call this when Health Tracking is first enabled.
 * Uses batch syncing for efficiency.
 *
 * @param days - Number of days to look back (default: 30)
 * @returns Object with sync results and Strava fallback status
 */
export async function backfillHistoricalHealth(days: number = 30): Promise<SyncHistoricalResult> {
    // Use the efficient batch sync function
    return syncHistoricalHealthData(days);
}

/**
 * Manually write weight to Google Health and the backend
 */
export async function writeManualWeight(weightKg: number, date: Date = new Date()): Promise<void> {
    if (!isMobile()) return;

    try {
        await Health.saveSample({
            dataType: 'weight',
            value: weightKg,
            unit: 'kilogram',
            startDate: date.toISOString(),
            endDate: date.toISOString(),
        });

        // Trigger a sync so the backend gets the new weight
        await syncDailyHealth(date);
    } catch (error) {
        logger.error('Failed to write weight to Health Connect', { error });
        throw error;
    }
}

/**
 * Sync historical health data result
 */
export interface SyncHistoricalResult {
    synced: number;
    stravaFallbackUsed: boolean;
    error?: string;
}

/**
 * Health data entry for batch sync
 */
export interface HealthDataEntry {
    date: string; // YYYY-MM-DD
    steps?: number;
    weight?: number;
}

/**
 * Sync historical health data (Steps and Weight) from Health Connect
 * for the specified number of days. Falls back to Strava for weight if unavailable.
 *
 * @param daysToSync - Number of days to look back (default: 30)
 * @returns Object with sync results and Strava fallback status
 */
export async function syncHistoricalHealthData(
    daysToSync: number = 30
): Promise<SyncHistoricalResult> {
    if (!isMobile()) {
        return { synced: 0, stravaFallbackUsed: false, error: 'Not a mobile device' };
    }

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - daysToSync);

    try {
        // Request read permissions for Steps and Weight
        await requestHealthPermissions();

        // Query for Steps aggregated by day
        const stepsMap = new Map<string, number>();
        try {
            const stepsResult = await Health.readSamples({
                dataType: 'steps',
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                limit: 10000,
            });

            if (stepsResult.samples) {
                // To aggregate historical data correctly, we group samples by day key first,
                // then deduplicate the samples within each day.
                const samplesByDay = new Map<string, any[]>();

                for (const sample of stepsResult.samples) {
                    const date = new Date(sample.startDate);
                    const dateKey = date.toISOString().split('T')[0];
                    if (!samplesByDay.has(dateKey)) {
                        samplesByDay.set(dateKey, []);
                    }
                    samplesByDay.get(dateKey)?.push(sample);
                }

                // Now deduplicate and sum each day's samples
                samplesByDay.forEach((samples, dateKey) => {
                    const dailyTotal = deduplicateSamples(samples);
                    stepsMap.set(dateKey, dailyTotal);
                });
            }
        } catch (error) {
            logger.error('Failed to read steps from Health Connect', { error });
        }

        // Query for Weight - get the most recent entry per day
        const weightMap = new Map<string, number>();
        try {
            const weightResult = await Health.readSamples({
                dataType: 'weight',
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                limit: 1000,
            });

            if (weightResult.samples) {
                // For each date, keep only the most recent weight entry
                const weightByDate = new Map<string, { value: number; timestamp: number }>();

                for (const sample of weightResult.samples) {
                    const date = new Date(sample.startDate);
                    const dateKey = date.toISOString().split('T')[0];
                    const timestamp = new Date(sample.startDate).getTime();

                    const existing = weightByDate.get(dateKey);
                    if (!existing || timestamp > existing.timestamp) {
                        weightByDate.set(dateKey, { value: sample.value, timestamp });
                    }
                }

                // Extract just the values
                weightByDate.forEach((data, dateKey) => {
                    weightMap.set(dateKey, data.value);
                });
            }
        } catch (error) {
            logger.error('Failed to read weight from Health Connect', { error });
        }

        // Combine data into unified format
        const allDates = new Set<string>();
        for (let i = 0; i < daysToSync; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            allDates.add(d.toISOString().split('T')[0]);
        }

        const healthData: HealthDataEntry[] = [];

        allDates.forEach(dateKey => {
            const entry: HealthDataEntry = { date: dateKey };

            if (stepsMap.has(dateKey)) {
                entry.steps = stepsMap.get(dateKey);
            }

            if (weightMap.has(dateKey)) {
                entry.weight = weightMap.get(dateKey);
            }

            // Only include entries that have at least some data
            if (entry.steps !== undefined || entry.weight !== undefined) {
                healthData.push(entry);
            }
        });

        // Send to backend batch sync endpoint
        const response = await fetch('/api/health/sync-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: healthData }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                synced: 0,
                stravaFallbackUsed: false,
                error: errorData.error || 'Failed to sync data'
            };
        }

        const result = await response.json();
        return {
            synced: result.synced || 0,
            stravaFallbackUsed: result.stravaFallbackUsed || false
        };
    } catch (error) {
        logger.error('Failed to sync historical health data', { error });
        return {
            synced: 0,
            stravaFallbackUsed: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
