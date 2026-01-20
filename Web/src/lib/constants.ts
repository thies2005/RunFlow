/**
 * Application Constants
 * 
 * Centralized configuration values to avoid magic numbers
 * and make the codebase more maintainable.
 */

export const METRICS = {
    CTL_DECAY_DAYS: 42,
    ATL_DECAY_DAYS: 7,
    EASY_TRIMP_WINDOW_DAYS: 7,
    WORKLOAD_RATIO_OPTIMAL_MIN: 0.8,
    WORKLOAD_RATIO_OPTIMAL_MAX: 1.3,
    WORKLOAD_RATIO_DANGER_MIN: 1.5,
};

export const ZONES = {
    DEFAULT_MAX_HR: 185,
    DEFAULT_REST_HR: 60,
};

export const TIME_RANGES = {
    SIX_MONTHS_DAYS: 180,
    NINETY_DAYS: 90,
    SESSION_TIMEOUT_DAYS: 7,
    SYNC_LOOKBACK_DAYS: 30,
};

/**
 * Pagination defaults
 */
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
} as const;

/**
 * Activity validation constraints
 */
export const ACTIVITY_LIMITS = {
    NAME_MAX_LENGTH: 200,
    MAX_DISTANCE_KM: 500,
    MAX_DURATION_MINUTES: 2880, // 48 hours
    MIN_HR_BPM: 30,
    MAX_HR_BPM: 250,
    RACE_ELIGIBLE_DISTANCE: 4500, // meters
} as const;

/**
 * HTTP caching durations (in seconds)
 */
export const CACHE_DURATIONS = {
    SHORT: 60,      // 1 minute
    MEDIUM: 300,    // 5 minutes
    LONG: 3600,     // 1 hour
    STATIC: 86400,  // 24 hours
} as const;
