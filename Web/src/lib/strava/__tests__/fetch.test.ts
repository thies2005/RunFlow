import { fetchActivityStreams, rateLimiter } from '../fetch';
import { logger } from '@/lib/logging/logger';

jest.mock('@/lib/logging/logger', () => ({
    logger: {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
    },
}));

describe('fetchActivityStreams', () => {
    const accessToken = 'test-token';
    const activityId = 123456;

    let fetchMock: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock global fetch
        fetchMock = jest.fn();
        global.fetch = fetchMock;

        // Mock rateLimiter
        jest.spyOn(rateLimiter, 'checkAndWait').mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should successfully fetch and map complete activity streams', async () => {
        const mockResponse = {
            time: { data: [0, 1, 2] },
            heartrate: { data: [120, 125, 130] },
            velocity_smooth: { data: [5.0, 5.1, 5.2] },
            altitude: { data: [100, 101, 102] },
            cadence: { data: [80, 82, 85] }
        };

        fetchMock.mockResolvedValue({
            status: 200,
            ok: true,
            json: jest.fn().mockResolvedValue(mockResponse),
        });

        const result = await fetchActivityStreams(accessToken, activityId);

        expect(rateLimiter.checkAndWait).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining(`/activities/${activityId}/streams?keys=time,heartrate,velocity_smooth,altitude,cadence&key_by_type=true`),
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        expect(result).toEqual({
            time: [0, 1, 2],
            heartrate: [120, 125, 130],
            velocity_smooth: [5.0, 5.1, 5.2],
            altitude: [100, 101, 102],
            cadence: [80, 82, 85]
        });
    });

    it('should handle missing optional streams gracefully', async () => {
        const mockResponse = {
            time: { data: [0, 1, 2] }
            // heartrate, velocity, altitude, cadence missing
        };

        fetchMock.mockResolvedValue({
            status: 200,
            ok: true,
            json: jest.fn().mockResolvedValue(mockResponse),
        });

        const result = await fetchActivityStreams(accessToken, activityId);

        expect(rateLimiter.checkAndWait).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            time: [0, 1, 2],
            heartrate: undefined,
            velocity_smooth: undefined,
            altitude: undefined,
            cadence: undefined
        });
    });

    it('should return null if time stream is missing', async () => {
        const mockResponse = {
            heartrate: { data: [120, 125, 130] }
        };

        fetchMock.mockResolvedValue({
            status: 200,
            ok: true,
            json: jest.fn().mockResolvedValue(mockResponse),
        });

        const result = await fetchActivityStreams(accessToken, activityId);

        expect(rateLimiter.checkAndWait).toHaveBeenCalledTimes(1);
        expect(result).toBeNull();
    });

    it('should return null and log warning when rate limit is exceeded (429)', async () => {
        fetchMock.mockResolvedValue({
            status: 429,
            ok: false,
        });

        const result = await fetchActivityStreams(accessToken, activityId);

        expect(rateLimiter.checkAndWait).toHaveBeenCalledTimes(1);
        expect(result).toBeNull();
        expect(logger.warn).toHaveBeenCalledWith('Strava rate limit exceeded for streams', { activityId });
    });

    it('should return null on generic API error (!response.ok and not 429)', async () => {
        fetchMock.mockResolvedValue({
            status: 500,
            ok: false,
        });

        const result = await fetchActivityStreams(accessToken, activityId);

        expect(rateLimiter.checkAndWait).toHaveBeenCalledTimes(1);
        expect(result).toBeNull();
        expect(logger.warn).not.toHaveBeenCalled(); // Warning is only for 429 in this function
    });
});

describe('fetchSingleActivity', () => {
    const accessToken = 'test-token';
    const activityId = 123456;

    let fetchMock: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock global fetch
        fetchMock = jest.fn();
        global.fetch = fetchMock;

        // Mock rateLimiter
        jest.spyOn(rateLimiter, 'checkAndWait').mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should fetch single activity successfully', async () => {
        const mockResponse = { id: activityId, name: 'Morning Run' };

        fetchMock.mockResolvedValue({
            status: 200,
            ok: true,
            json: jest.fn().mockResolvedValue(mockResponse),
        });

        const { fetchSingleActivity } = await import('../fetch');
        const result = await fetchSingleActivity(accessToken, activityId);

        expect(rateLimiter.checkAndWait).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining(`/activities/${activityId}`),
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        expect(result).toEqual(mockResponse);
    });

    it('should throw error on failure', async () => {
        fetchMock.mockResolvedValue({
            status: 404,
            ok: false,
            text: jest.fn().mockResolvedValue('Not Found'),
        });

        const { fetchSingleActivity } = await import('../fetch');
        await expect(fetchSingleActivity(accessToken, activityId)).rejects.toThrow('Strava API error: 404 Not Found');
    });
});

describe('fetchAthleteProfile', () => {
    const accessToken = 'test-token';

    let fetchMock: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock global fetch
        fetchMock = jest.fn();
        global.fetch = fetchMock;

        // Mock rateLimiter
        jest.spyOn(rateLimiter, 'checkAndWait').mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should fetch athlete profile successfully', async () => {
        const mockResponse = { id: 1, username: 'testuser' };

        fetchMock.mockResolvedValue({
            status: 200,
            ok: true,
            json: jest.fn().mockResolvedValue(mockResponse),
        });

        const { fetchAthleteProfile } = await import('../fetch');
        const result = await fetchAthleteProfile(accessToken);

        expect(rateLimiter.checkAndWait).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining(`/athlete`),
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        expect(result).toEqual(mockResponse);
    });

    it('should return null on failure', async () => {
        fetchMock.mockResolvedValue({
            status: 401,
            ok: false,
        });

        const { fetchAthleteProfile } = await import('../fetch');
        const result = await fetchAthleteProfile(accessToken);

        expect(result).toBeNull();
        expect(logger.warn).toHaveBeenCalledWith('Failed to fetch athlete profile', { status: 401 });
    });
});
