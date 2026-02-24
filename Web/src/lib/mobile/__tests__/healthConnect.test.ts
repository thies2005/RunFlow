
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

    it('should deduplicate overlapping samples by taking the maximum total from any single source', async () => {
        const mockSamples = [
            // Source A: Total = 600 steps (e.g. Google Fit)
            {
                startDate: '2023-10-01T10:00:00Z',
                endDate: '2023-10-01T10:15:00Z',
                value: 400,
                dataType: 'steps',
                sourceName: 'com.google.fit'
            },
            {
                startDate: '2023-10-01T14:00:00Z',
                endDate: '2023-10-01T14:15:00Z',
                value: 200,
                dataType: 'steps',
                sourceName: 'com.google.fit'
            },

            // Source B: Total = 850 steps (e.g. Samsung Health, caught more activity)
            {
                startDate: '2023-10-01T10:05:00Z',
                endDate: '2023-10-01T10:15:00Z',
                value: 350,
                dataType: 'steps',
                sourceName: 'com.sec.android.app.shealth'
            },
            {
                startDate: '2023-10-01T14:00:00Z',
                endDate: '2023-10-01T14:30:00Z',
                value: 500,
                dataType: 'steps',
                sourceName: 'com.sec.android.app.shealth'
            }
        ];

        (Health.readSamples as jest.Mock).mockResolvedValueOnce({ samples: mockSamples });
        (Health.readSamples as jest.Mock).mockResolvedValueOnce({ samples: [] }); // Weight

        await syncDailyHealth(new Date('2023-10-01'));

        // Check if fetch was called with the maximum source total (850 from Source B)
        expect(global.fetch).toHaveBeenCalledWith('/api/health/daily', expect.objectContaining({
            body: expect.stringContaining('"steps":850')
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
