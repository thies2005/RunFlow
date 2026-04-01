/**
 * Strava API Communication Module
 * 
 * Handles all HTTP communication with Strava API including:
 * - Activity fetching (paginated)
 * - Activity streams fetching
 * - Athlete profile fetching
 * - Rate limiting management
 */

import { getRedisClient, type RedisClient } from '@/lib/redis';
import { MINUTE_MS } from '@/lib/constants';
import { logger } from '@/lib/logging/logger';
import { decryptToken } from '@/lib/crypto';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const MAX_PER_PAGE = 200;
const RATE_LIMIT_REQUESTS = 95;
const RATE_LIMIT_WINDOW_MS = 15 * MINUTE_MS;
const MAX_RETRIES = 3;

const RATE_LIMIT_KEY = 'strava:rate_limit:requests';

function tryDecryptOrPlaintextAccessToken(token: string | null | undefined, userId: string): string | null {
    if (!token) {
        return null;
    }

    try {
        return decryptToken(token);
    } catch (error) {
        logger.warn('Falling back to legacy plaintext Strava access token', {
            userId,
            error: error instanceof Error ? error.message : String(error),
        });
        return token;
    }
}

export interface StravaActivity {
    id: number;
    name: string;
    type: string;
    sport_type: string;
    start_date: string;
    timezone: string;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    average_speed: number;
    max_speed: number;
    average_grade_adjusted_speed?: number;
    average_heartrate?: number;
    max_heartrate?: number;
    has_heartrate: boolean;
    total_elevation_gain: number;
    elev_high?: number;
    elev_low?: number;
    description?: string;
    workout_type?: number;
    average_cadence?: number;
    calories?: number;
}

export const rateLimiter = {
    requests: 0,
    windowStart: Date.now(),

    async checkAndWait(): Promise<void> {
        const redis = await getRedisClient();

        if (redis) {
            return this.checkAndWaitRedis(redis);
        }

        const now = Date.now();

        if (now - this.windowStart > RATE_LIMIT_WINDOW_MS) {
            this.requests = 0;
            this.windowStart = now;
        }

        if (this.requests >= RATE_LIMIT_REQUESTS) {
            const waitTime = RATE_LIMIT_WINDOW_MS - (now - this.windowStart) + 1000;
            logger.info('Rate limit reached (In-Memory), waiting', { waitSeconds: waitTime / 1000 });
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.requests = 0;
            this.windowStart = Date.now();
        }

        this.requests++;
    },

    async checkAndWaitRedis(redis: RedisClient, maxAttempts: number = 10): Promise<void> {
        const windowSeconds = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
        let attempts = 0;

        while (attempts < maxAttempts) {
            attempts++;
            const current = await redis.incr(RATE_LIMIT_KEY);

            if (current === 1) {
                await redis.expire(RATE_LIMIT_KEY, windowSeconds);
                return;
            }

            if (current <= RATE_LIMIT_REQUESTS) {
                return;
            }

            const ttl = await redis.ttl(RATE_LIMIT_KEY);

            if (ttl === -1) {
                logger.warn('Rate limit key found without TTL, forcing expiration');
                await redis.expire(RATE_LIMIT_KEY, windowSeconds);
                const waitTime = windowSeconds;
                logger.info('Rate limit reached (Redis, no TTL fixed), waiting', { waitSeconds: waitTime });
                await new Promise(resolve => setTimeout(resolve, (waitTime + 1) * 1000));
                continue;
            }

            if (ttl === -2) {
                continue;
            }

            const waitTime = ttl > 0 ? ttl : windowSeconds;
            logger.info('Rate limit reached (Redis), waiting', { waitSeconds: waitTime });
            await new Promise(resolve => setTimeout(resolve, (waitTime + 1) * 1000));
        }

        throw new Error('Strava rate limit exceeded: max retry attempts reached in Redis rate limiter');
    }
};

export async function fetchStravaActivities(
    accessToken: string,
    page: number = 1,
    after?: number,
    _retryCount: number = 0
): Promise<StravaActivity[]> {
    await rateLimiter.checkAndWait();

    const params = new URLSearchParams({
        page: page.toString(),
        per_page: MAX_PER_PAGE.toString(),
    });

    if (after) {
        params.append('after', after.toString());
    }

    const response = await fetch(
        `${STRAVA_API_BASE}/athlete/activities?${params}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (response.status === 429) {
        if (_retryCount >= MAX_RETRIES) {
            throw new Error(`Strava rate limit exceeded: max retries (${MAX_RETRIES}) reached`);
        }
        const retryAfter = parseInt(response.headers.get('Retry-After') || '900');
        logger.warn('Rate limited by Strava, waiting', { retryAfter });
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return fetchStravaActivities(accessToken, page, after, _retryCount + 1);
    }

    if (!response.ok) {
        throw new Error(`Strava API error: ${response.status} ${await response.text()}`);
    }

    return response.json();
}

export async function fetchSingleActivity(accessToken: string, activityId: number): Promise<StravaActivity> {
    await rateLimiter.checkAndWait();

    const response = await fetch(
        `${STRAVA_API_BASE}/activities/${activityId}`,
        {
            headers: { Authorization: `Bearer ${accessToken}` },
        }
    );

    if (!response.ok) {
        throw new Error(`Strava API error: ${response.status} ${await response.text()}`);
    }

    return response.json();
}

export async function fetchActivityStreams(
    accessToken: string,
    activityId: number
): Promise<{ time: number[]; heartrate?: number[]; velocity_smooth?: number[]; altitude?: number[]; cadence?: number[] } | null> {
    await rateLimiter.checkAndWait();

    const response = await fetch(
        `${STRAVA_API_BASE}/activities/${activityId}/streams?keys=time,heartrate,velocity_smooth,altitude,cadence&key_by_type=true`,
        {
            headers: { Authorization: `Bearer ${accessToken}` },
        }
    );

    if (response.status === 429) {
        logger.warn('Strava rate limit exceeded for streams', { activityId });
        return null;
    }

    if (!response.ok) return null;

    const streams = await response.json();
    if (!streams.time) return null;

    return {
        time: streams.time.data,
        heartrate: streams.heartrate?.data,
        velocity_smooth: streams.velocity_smooth?.data,
        altitude: streams.altitude?.data,
        cadence: streams.cadence?.data,
    };
}

export async function fetchAthleteProfile(accessToken: string) {
    await rateLimiter.checkAndWait();
    const response = await fetch(`${STRAVA_API_BASE}/athlete`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        logger.warn('Failed to fetch athlete profile', { status: response.status });
        return null;
    }

    return response.json();
}

/**
 * Strava Athlete Profile Response
 */
export interface StravaAthleteProfile {
    id: number;
    username?: string;
    firstname?: string;
    lastname?: string;
    city?: string;
    state?: string;
    country?: string;
    sex?: string;
    weight?: number; // kg
    profile_medium?: string;
    profile?: string;
}

/**
 * Get the current athlete's weight from Strava
 * Returns weight in kg, or null if not set
 */
export async function getStravaAthleteWeight(userId: string): Promise<number | null> {
    const { prisma } = await import('@/lib/db');

    // Find user's Strava account with access token
    const account = await prisma.account.findFirst({
        where: {
            userId,
            provider: 'strava'
        },
        select: {
            access_token: true,
            expires_at: true,
            refresh_token: true,
            id: true
        }
    });

    if (!account?.access_token) {
        logger.warn('No Strava account found for user', { userId });
        return null;
    }

    // Decrypt the access token (or fallback to legacy plaintext token)
    let accessToken: string | null = tryDecryptOrPlaintextAccessToken(account.access_token, userId);
    if (!accessToken) {
        logger.warn('Failed to decrypt Strava access token', { userId });
        return null;
    }

    // Check if token needs refresh (with 5 min buffer)
    const now = Math.floor(Date.now() / 1000);
    if (account.expires_at && account.expires_at < now + 300) {
        // Import refreshStravaToken dynamically to avoid circular dependency
        const { refreshStravaToken } = await import('@/lib/strava/oauth');
        accessToken = await refreshStravaToken(userId);
        if (!accessToken) {
            logger.warn('Failed to refresh Strava token for weight fetch', { userId });
            return null;
        }
    }

    await rateLimiter.checkAndWait();

    const response = await fetch(`${STRAVA_API_BASE}/athlete`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        logger.warn('Failed to fetch Strava athlete for weight', { status: response.status, userId });
        return null;
    }

    const athlete: StravaAthleteProfile = await response.json();

    // Strava returns weight in kg, may be null or undefined
    return athlete.weight ?? null;
}
