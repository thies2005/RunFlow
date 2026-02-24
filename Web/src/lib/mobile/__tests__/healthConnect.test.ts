
// Mock the Capacitor Health plugin
jest.mock('@capgo/capacitor-health', () => ({
    Health: {
        readSamples: jest.fn(),
        isAvailable: jest.fn(),
        requestAuthorization: jest.fn(),
        queryWorkouts: jest.fn(),
    },
}));

// Mock Capacitor directly
jest.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: jest.fn(() => true),
    },
}));

import { syncDailyHealth } from '../healthConnect';
import { Health } from '@capgo/capacitor-health';

describe('Health Connect Deduplication', () => {
    beforeEach(() => {
        console.log('Setting up test...');
        jest.clearAllMocks();
        // Mock fetch
        global.fetch = jest.fn().mockImplementation(() => {
            console.log('Fetch called');
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            });
        });
    });

    it('should deduplicate overlapping samples by taking the maximum', async () => {
        const mockSamples = [
            {
                startDate: '2023-10-01T10:00:00Z',
                endDate: '2023-10-01T10:15:00Z',
                value: 500, // Source A
                dataType: 'steps',
            },
            {
                startDate: '2023-10-01T10:00:00Z',
                endDate: '2023-10-01T10:15:00Z',
                value: 450, // Source B (Lower value, should be ignored)
                dataType: 'steps',
            },
            {
                startDate: '2023-10-01T10:15:01Z',
                endDate: '2023-10-01T10:30:00Z',
                value: 300, // New interval
                dataType: 'steps',
            }
        ];

        (Health.readSamples as jest.Mock).mockResolvedValueOnce({ samples: mockSamples });
        (Health.readSamples as jest.Mock).mockResolvedValueOnce({ samples: [] }); // Weight

        await syncDailyHealth(new Date('2023-10-01'));

        // Check if fetch was called with deduplicated total (500 + 300 = 800)
        expect(global.fetch).toHaveBeenCalledWith('/api/health/daily', expect.objectContaining({
            body: expect.stringContaining('"steps":800')
        }));
    });

    it('should handle empty samples', async () => {
        (Health.readSamples as jest.Mock).mockResolvedValue({ samples: [] });

        await syncDailyHealth(new Date('2023-10-01'));

        expect(global.fetch).toHaveBeenCalledWith('/api/health/daily', expect.objectContaining({
            body: expect.not.stringContaining('"steps"')
        }));
    });
});
