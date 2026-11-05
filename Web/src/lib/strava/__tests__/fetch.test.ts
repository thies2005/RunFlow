import { fetchActivityStreams, rateLimiter, shouldFetchActivityStreams } from '../fetch';
import { logger } from '@/lib/logging/logger';

// Mock the logger
jest.mock('@/lib/logging/logger', () => ({
    logger: {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn()
    }
}));

describe('fetchActivityStreams', () => {
    it('imports GPS for outdoor variants and other located sports without fetching indoor strength streams', () => {
        for (const type of ['TrailRun', 'GravelRide', 'MountainBikeRide', 'Walk', 'Hike', 'Swim']) {
            expect(shouldFetchActivityStreams({type})).toBe(true);
        }
        expect(shouldFetchActivityStreams({type: 'Kayaking', start_latlng: [0, 0]})).toBe(true);
        expect(shouldFetchActivityStreams({type: 'EBikeRide', map: {summary_polyline: 'stored-route'}})).toBe(true);
        expect(shouldFetchActivityStreams({type: 'WeightTraining'})).toBe(false);
    });
    const mockAccessToken = 'mock-token';
    const mockActivityId = 12345;

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock global fetch
        global.fetch = jest.fn();
        // Spy on rateLimiter to prevent actual delays or Redis calls
        jest.spyOn(rateLimiter, 'checkAndWait').mockResolvedValue(undefined);
    });

    it('should correctly map all streams when present (happy path)', async () => {
        const mockStreamsResponse = {
            time: { data: [0, 1, 2] },
            heartrate: { data: [120, 125, 130] },
            velocity_smooth: { data: [3.5, 3.6, 3.7] },
            altitude: { data: [100, 101, 102] },
            cadence: { data: [85, 86, 87] },
            latlng: { data: [[50, 6], [50.1, 6.1]] }
        };

        (global.fetch as jest.Mock).mockResolvedValue({
            status: 200,
            ok: true,
            json: jest.fn().mockResolvedValue(mockStreamsResponse)
        });

        const result = await fetchActivityStreams(mockAccessToken, mockActivityId);

        expect(rateLimiter.checkAndWait).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining(`/activities/${mockActivityId}/streams?keys=time,heartrate,velocity_smooth,altitude,cadence,watts,latlng&key_by_type=true`),
            expect.objectContaining({
                headers: { Authorization: `Bearer ${mockAccessToken}` }
            })
        );
        expect(result).toEqual({
            time: [0, 1, 2],
            heartrate: [120, 125, 130],
            velocity_smooth: [3.5, 3.6, 3.7],
            altitude: [100, 101, 102],
            cadence: [85, 86, 87],
            latlng: [[50, 6], [50.1, 6.1]]
        });
    });

    it('should successfully map data when some optional streams are missing', async () => {
        // Missing heartrate and cadence
        const mockStreamsResponse = {
            time: { data: [0, 1, 2] },
            velocity_smooth: { data: [3.5, 3.6, 3.7] },
            altitude: { data: [100, 101, 102] }
        };

        (global.fetch as jest.Mock).mockResolvedValue({
            status: 200,
            ok: true,
            json: jest.fn().mockResolvedValue(mockStreamsResponse)
        });

        const result = await fetchActivityStreams(mockAccessToken, mockActivityId);

        expect(result).toEqual({
            time: [0, 1, 2],
            heartrate: undefined,
            velocity_smooth: [3.5, 3.6, 3.7],
            altitude: [100, 101, 102],
            cadence: undefined
        });
    });

    it('should return null and log a warning on 429 rate limit error', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            status: 429,
            ok: false
        });

        const result = await fetchActivityStreams(mockAccessToken, mockActivityId);

        expect(result).toBeNull();
        expect(logger.warn).toHaveBeenCalledWith('Strava rate limit exceeded for streams', { activityId: mockActivityId });
    });

    it('should return null on non-OK responses other than 429', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            status: 404,
            ok: false
        });

        const result = await fetchActivityStreams(mockAccessToken, mockActivityId);

        expect(result).toBeNull();
        expect(logger.warn).not.toHaveBeenCalled(); // Warning is specific to 429
    });

    it('should return null when the API responds successfully but is missing the time stream', async () => {
        const mockStreamsResponse = {
            heartrate: { data: [120, 125, 130] } // No time stream
        };

        (global.fetch as jest.Mock).mockResolvedValue({
            status: 200,
            ok: true,
            json: jest.fn().mockResolvedValue(mockStreamsResponse)
        });

        const result = await fetchActivityStreams(mockAccessToken, mockActivityId);

        expect(result).toBeNull();
    });
});
