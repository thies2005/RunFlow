import { Capacitor } from '@capacitor/core';
import { Health, HealthDataType, WorkoutType, Workout } from '@capgo/capacitor-health';

export const isMobile = () => Capacitor.isNativePlatform();

// Data types we request permission for
const REQUIRED_READ_PERMISSIONS: HealthDataType[] = [
    'distance',
    'heartRate',
    'steps',
    'calories',
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
        console.error('Health Connect availability check failed:', error);
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
            write: [],
        });

        // Open Health Connect settings so user can grant Workouts/Exercise permission
        // The plugin's requestAuthorization doesn't support workout permissions directly,
        // so the user must grant READ_EXERCISE through the Health Connect app settings
        await Health.openHealthConnectSettings();

        // We return true to indicate settings were opened
        // The actual permission check happens when we try to query workouts
        return true;
    } catch (error) {
        console.error('Health Connect Permission Error:', error);
        return false;
    }
}

/**
 * Fetch workout activities from Health Connect
 */
export async function fetchHealthActivities(days = 30): Promise<HealthActivity[]> {
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
            console.log('No workouts found in Health Connect');
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

            activities.push({
                name: workoutName,
                type: runflowType,
                startDate,
                endDate,
                distance: workout.totalDistance || undefined,
                duration: workout.duration,
                calories: workout.totalEnergyBurned || undefined,
            });
        }

        return activities;
    } catch (error) {
        console.error('Failed to fetch Health Connect activities:', error);
        return [];
    }
}

/**
 * Sync Health Connect activities to RunFlow API
 * Returns number of activities synced (excluding duplicates)
 */
export async function syncHealthData(days = 30): Promise<{ synced: number; errors: number; skipped: number }> {
    if (!isMobile()) {
        return { synced: 0, errors: 0, skipped: 0 };
    }

    const activities = await fetchHealthActivities(days);
    let synced = 0;
    let errors = 0;
    let skipped = 0;

    console.log(`Found ${activities.length} activities in Health Connect`);

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
                console.error('Failed to sync activity:', activity.name, errorData);
                errors++;
            }
        } catch (error) {
            console.error('Error syncing activity:', activity.name, error);
            errors++;
        }
    }

    console.log(`Health Connect sync complete: ${synced} new, ${skipped} skipped, ${errors} errors`);
    return { synced, errors, skipped };
}
