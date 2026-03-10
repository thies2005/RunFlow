import { checkBackupHealth } from '../alert'
import { getBackupStatus } from '../status'
import { DAY_MS } from '@/lib/constants'

jest.mock('../status', () => ({
    getBackupStatus: jest.fn()
}))

describe('checkBackupHealth', () => {
    const mockNow = 1700000000000; // arbitrary timestamp

    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(mockNow);
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return healthy when all conditions are met', async () => {
        const mockGetBackupStatus = getBackupStatus as jest.Mock;
        mockGetBackupStatus.mockResolvedValue({
            lastBackupTime: new Date(mockNow - DAY_MS).toISOString(), // 1 day ago
            lastBackupSuccess: true,
            lastBackupError: null,
            isSchedulerRunning: true,
            lastBackupSize: 1024
        });

        const result = await checkBackupHealth();

        expect(result.healthy).toBe(true);
        expect(result.issues).toHaveLength(0);
        expect(result.recommendations).toHaveLength(0);
    });

    it('should handle no backup ever created', async () => {
        const mockGetBackupStatus = getBackupStatus as jest.Mock;
        mockGetBackupStatus.mockResolvedValue({
            lastBackupTime: null,
        });

        const result = await checkBackupHealth();

        expect(result.healthy).toBe(false);
        expect(result.issues).toContain('No backup has ever been created');
        expect(result.recommendations).toContain('Create an initial backup manually');
    });

    it('should handle backup too old', async () => {
        const mockGetBackupStatus = getBackupStatus as jest.Mock;
        const backupAgeDays = 3;
        mockGetBackupStatus.mockResolvedValue({
            lastBackupTime: new Date(mockNow - backupAgeDays * DAY_MS).toISOString(),
            lastBackupSuccess: true,
            lastBackupError: null,
            isSchedulerRunning: true,
            lastBackupSize: 1024
        });

        const result = await checkBackupHealth();

        expect(result.healthy).toBe(false);
        expect(result.issues).toContain(`Last backup is ${backupAgeDays} days old`);
        expect(result.recommendations).toContain('Check if the backup scheduler is running');
    });

    it('should handle failed backup', async () => {
        const mockGetBackupStatus = getBackupStatus as jest.Mock;
        mockGetBackupStatus.mockResolvedValue({
            lastBackupTime: new Date(mockNow - DAY_MS).toISOString(),
            lastBackupSuccess: false,
            lastBackupError: null,
            isSchedulerRunning: true,
            lastBackupSize: 1024
        });

        const result = await checkBackupHealth();

        expect(result.healthy).toBe(false);
        expect(result.issues).toContain('Last backup attempt failed');
        expect(result.recommendations).toContain('Review backup logs and error messages');
    });

    it('should handle backup error', async () => {
        const mockGetBackupStatus = getBackupStatus as jest.Mock;
        mockGetBackupStatus.mockResolvedValue({
            lastBackupTime: new Date(mockNow - DAY_MS).toISOString(),
            lastBackupSuccess: true,
            lastBackupError: 'Some error occurred',
            isSchedulerRunning: true,
            lastBackupSize: 1024
        });

        const result = await checkBackupHealth();

        expect(result.healthy).toBe(false);
        expect(result.issues).toContain('Backup error: Some error occurred');
        expect(result.recommendations).toContain('Investigate and resolve the error condition');
    });

    it('should handle scheduler not running', async () => {
        const mockGetBackupStatus = getBackupStatus as jest.Mock;
        mockGetBackupStatus.mockResolvedValue({
            lastBackupTime: new Date(mockNow - DAY_MS).toISOString(),
            lastBackupSuccess: true,
            lastBackupError: null,
            isSchedulerRunning: false,
            lastBackupSize: 1024
        });

        const result = await checkBackupHealth();

        expect(result.healthy).toBe(false);
        expect(result.issues).toContain('Backup scheduler is not running');
        expect(result.recommendations).toContain('Start the backup scheduler');
    });

    it('should handle zero backup size', async () => {
        const mockGetBackupStatus = getBackupStatus as jest.Mock;
        mockGetBackupStatus.mockResolvedValue({
            lastBackupTime: new Date(mockNow - DAY_MS).toISOString(),
            lastBackupSuccess: true,
            lastBackupError: null,
            isSchedulerRunning: true,
            lastBackupSize: 0
        });

        const result = await checkBackupHealth();

        expect(result.healthy).toBe(false);
        expect(result.issues).toContain('Last backup file is empty');
        expect(result.recommendations).toContain('Check database connection and storage');
    });

    it('should accumulate multiple issues', async () => {
        const mockGetBackupStatus = getBackupStatus as jest.Mock;
        const backupAgeDays = 3;
        mockGetBackupStatus.mockResolvedValue({
            lastBackupTime: new Date(mockNow - backupAgeDays * DAY_MS).toISOString(),
            lastBackupSuccess: false,
            lastBackupError: 'Network error',
            isSchedulerRunning: false,
            lastBackupSize: 0
        });

        const result = await checkBackupHealth();

        expect(result.healthy).toBe(false);
        expect(result.issues).toHaveLength(5);
        expect(result.recommendations).toHaveLength(5);

        expect(result.issues).toContain(`Last backup is ${backupAgeDays} days old`);
        expect(result.issues).toContain('Last backup attempt failed');
        expect(result.issues).toContain('Backup error: Network error');
        expect(result.issues).toContain('Backup scheduler is not running');
        expect(result.issues).toContain('Last backup file is empty');
    });
});
