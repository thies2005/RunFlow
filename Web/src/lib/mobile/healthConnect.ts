import { Capacitor } from '@capacitor/core';
import { Health } from '@capgo/capacitor-health';

export const isMobile = () => Capacitor.isNativePlatform();

/**
 * Request permissions for Health Connect
 */
export async function requestHealthPermissions(): Promise<boolean> {
    if (!isMobile()) return false;

    try {
        const status = await Health.requestAuthorization({

            read: ['steps', 'distance', 'calories', 'heartRate', 'weight'],
            write: [], // We only read for now
        });

        // Check if we have access (simplified check, real app might check each permission)
        return true;
    } catch (error) {
        console.error('Health Connect Permission Error:', error);
        return false;
    }
}

/**
 * Sync logic: Fetch data from Health Connect and upload to API
 */
export async function syncHealthData(days = 1) {
    if (!isMobile()) return;

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    try {
        // Example: Fetch Steps using queryAggregated (available in plugin)
        // Note: Check plugin docs for specific query method signature
        // This is a conceptual implementation based on typical usage

        // Pseudo-code for fetching steps
        /*
        const steps = await Health.query({
            name: 'steps',
            startDate: start,
            endDate: end
        });
        */

        console.log('Syncing health data...');

        // TODO: Call your existing API
        // await fetch('/api/activities', { method: 'POST', body: ... });

    } catch (e) {
        console.error('Sync failed', e);
    }
}
