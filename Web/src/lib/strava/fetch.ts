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

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const MAX_PER_PAGE = 200;
const RATE_LIMIT_REQUESTS = 95;
const RATE_LIMIT_WINDOW_MS = 15 * MINUTE_MS;

const RATE_LIMIT_KEY = 'strava:rate_limit:requests';

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

    async checkAndWaitRedis(redis: RedisClient): Promise<void> {
        const windowSeconds = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);

        while (true) {
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
    }
};

export async function fetchStravaActivities(
    accessToken: string,
    page: number = 1,
    after?: number
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
        const retryAfter = parseInt(response.headers.get('Retry-After') || '900');
        logger.warn('Rate limited by Strava, waiting', { retryAfter });
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return fetchStravaActivities(accessToken, page, after);
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
