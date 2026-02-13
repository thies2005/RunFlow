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

export const RETENTION = {
    DAILY: 7,
    WEEKLY: 4,
    MONTHLY: 12,
} as const;

export const AUTH_TOKEN_DURATION = 15 * 60;

export const SECONDS_PER_HOUR = 3600;

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
    MAX_DURATION_MINUTES: 2880,
    MIN_HR_BPM: 30,
    MAX_HR_BPM: 250,
    RACE_ELIGIBLE_DISTANCE: 4500,
} as const;

/**
 * HTTP caching durations (in seconds)
 */
export const CACHE_DURATIONS = {
    SHORT: 60,
    MEDIUM: 300,
    LONG: 3600,
    STATIC: 86400,
} as const;

/**
 * Heart rate zones max values
 */
export const HEART_RATE_ZONES = {
    ZONE_1_MAX: 130,
    ZONE_2_MAX: 148,
    ZONE_3_MAX: 160,
    ZONE_4_MAX: 170,
    ZONE_5_MAX: 178,
    ZONE_6_MAX: 187,
} as const;

export const ZONE_1_MAX = HEART_RATE_ZONES.ZONE_1_MAX;
export const ZONE_2_MAX = HEART_RATE_ZONES.ZONE_2_MAX;
export const ZONE_3_MAX = HEART_RATE_ZONES.ZONE_3_MAX;
export const ZONE_4_MAX = HEART_RATE_ZONES.ZONE_4_MAX;
export const ZONE_5_MAX = HEART_RATE_ZONES.ZONE_5_MAX;
export const ZONE_6_MAX = HEART_RATE_ZONES.ZONE_6_MAX;

/**
 * Rate limit configurations
 */
export const RATE_LIMITS = {
    PUBLIC: {
        LIMIT: 100,
        WINDOW: 60000,
    },
    AUTHENTICATED: {
        LIMIT: 200,
        WINDOW: 60000,
    },
    ADMIN_READ: {
        LIMIT: 60,
        WINDOW: 60000,
    },
    ADMIN_WRITE: {
        LIMIT: 10,
        WINDOW: 60000,
    },
    ADMIN_SENSITIVE: {
        LIMIT: 3,
        WINDOW: 60000,
    },
} as const;

export const PUBLIC = RATE_LIMITS.PUBLIC;
export const AUTHENTICATED = RATE_LIMITS.AUTHENTICATED;
export const ADMIN_READ = RATE_LIMITS.ADMIN_READ;
export const ADMIN_WRITE = RATE_LIMITS.ADMIN_WRITE;
export const ADMIN_SENSITIVE = RATE_LIMITS.ADMIN_SENSITIVE;

/**
 * Password policy
 */
export const PASSWORD_POLICY = {
    MIN_LENGTH: 12,
} as const;

export const MIN_LENGTH = PASSWORD_POLICY.MIN_LENGTH;

/**
 * Time constants in milliseconds
 */
export const TIME_CONSTANTS = {
    DAY_MS: 86400000,
    HOUR_MS: 3600000,
    MINUTE_MS: 60000,
    SECOND_MS: 1000,
} as const;

export const DAY_MS = TIME_CONSTANTS.DAY_MS;
export const HOUR_MS = TIME_CONSTANTS.HOUR_MS;
export const MINUTE_MS = TIME_CONSTANTS.MINUTE_MS;
export const SECOND_MS = TIME_CONSTANTS.SECOND_MS;
