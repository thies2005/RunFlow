/**
 * Shared formatting utilities for RunFlow
 * L-02: Consolidated time/duration/pace formatting functions
 */

/**
 * Format seconds to HH:MM:SS or MM:SS string
 */
export function formatDuration(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined || seconds <= 0) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);

    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format seconds to race time (H:MM:SS)
 */
export function formatRaceTime(totalSeconds: number): string {
    if (totalSeconds <= 0) return '0:00';

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.round(totalSeconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format pace in seconds per km to M:SS/km string
 */
export function formatPace(secondsPerKm: number | null | undefined): string {
    if (secondsPerKm === null || secondsPerKm === undefined || secondsPerKm <= 0) return '--:--';

    const mins = Math.floor(secondsPerKm / 60);
    const secs = Math.round(secondsPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

/**
 * Format speed in m/s to pace string (M:SS/km)
 */
export function formatSpeedAsPace(speedMs: number | null | undefined): string {
    if (speedMs === null || speedMs === undefined || speedMs <= 0) return '--:--';

    const paceSecsPerKm = 1000 / speedMs;
    return formatPace(paceSecsPerKm);
}

/**
 * Format distance in meters to km with specified decimals
 */
export function formatDistance(meters: number | null | undefined, decimals: number = 2): string {
    if (meters === null || meters === undefined || meters < 0) return '0';

    return (meters / 1000).toFixed(decimals);
}

/**
 * Format distance with unit suffix
 */
export function formatDistanceWithUnit(meters: number | null | undefined, decimals: number = 2): string {
    return `${formatDistance(meters, decimals)} km`;
}

/**
 * Parse time string (HH:MM:SS or MM:SS) to total seconds
 */
export function parseTimeToSeconds(timeStr: string): number {
    const parts = timeStr.split(':').map(p => parseInt(p, 10) || 0);

    if (parts.length === 3) {
        // HH:MM:SS
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        // MM:SS
        return parts[0] * 60 + parts[1];
    }

    return 0;
}
