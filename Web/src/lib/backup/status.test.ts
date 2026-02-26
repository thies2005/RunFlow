
import * as path from 'path';

const mockAccess = jest.fn();
const mockMkdir = jest.fn();
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();

// Mock fs and fs/promises BEFORE imports
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    promises: {
        access: mockAccess,
        mkdir: mockMkdir,
        readFile: mockReadFile,
        writeFile: mockWriteFile,
    }
}));

describe('Backup Status (Async)', () => {
    let statusModule: typeof import('./status');
    const backupDir = path.join(process.cwd(), 'backups');
    const statusFile = path.join(backupDir, '.backup-status.json');

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.resetModules();
        statusModule = await import('./status');

        // Spy on console.error to suppress error logging during tests
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('getBackupStatus should return default status if file does not exist', async () => {
        mockAccess.mockImplementation(async (p: string) => {
            if (p === backupDir) return Promise.resolve();
            if (p === statusFile) return Promise.reject(new Error('File not found'));
            return Promise.reject(new Error('Unknown path'));
        });

        const status = await statusModule.getBackupStatus();

        expect(status).toEqual(expect.objectContaining({
            scheduledBackupsCount: 0,
            isSchedulerRunning: false
        }));
    });

    it('getBackupStatus should load status from file if it exists', async () => {
        const mockStatus = {
            lastBackupTime: '2023-01-01T00:00:00.000Z',
            lastBackupPath: '/path/to/backup.sql',
            lastBackupSize: 1024,
            lastBackupSuccess: true,
            lastBackupError: null,
            scheduledBackupsCount: 5,
            isSchedulerRunning: true,
            uptime: 100
        };

        mockAccess.mockResolvedValue(undefined); // File exists
        mockReadFile.mockResolvedValue(JSON.stringify(mockStatus));

        const status = await statusModule.getBackupStatus();

        expect(mockReadFile).toHaveBeenCalledWith(statusFile, 'utf-8');
        expect(status).toEqual(mockStatus);
    });

    it('updateBackupStatus should save status to file', async () => {
        mockAccess.mockResolvedValue(undefined); // Dir exists

        await statusModule.updateBackupStatus({ scheduledBackupsCount: 10 });

        expect(mockWriteFile).toHaveBeenCalled();
        const callArgs = mockWriteFile.mock.calls[0];
        expect(callArgs[0]).toBe(statusFile);
        const writtenData = JSON.parse(callArgs[1]);
        expect(writtenData.scheduledBackupsCount).toBe(10);
    });

    it('recordBackupSuccess should update status and save', async () => {
        const backupPath = '/new/backup.sql';
        const size = 2048;

        mockAccess.mockResolvedValue(undefined);

        await statusModule.recordBackupSuccess(backupPath, size);

        expect(mockWriteFile).toHaveBeenCalled();
        const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]);
        expect(writtenData.lastBackupPath).toBe(backupPath);
        expect(writtenData.lastBackupSize).toBe(size);
        expect(writtenData.lastBackupSuccess).toBe(true);
        expect(writtenData.lastBackupError).toBeNull();
    });

    it('recordBackupFailure should update status and save', async () => {
        const errorMsg = 'Backup failed';

        mockAccess.mockResolvedValue(undefined);

        await statusModule.recordBackupFailure(errorMsg);

        expect(mockWriteFile).toHaveBeenCalled();
        const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]);
        expect(writtenData.lastBackupSuccess).toBe(false);
        expect(writtenData.lastBackupError).toBe(errorMsg);
    });

    it('setSchedulerRunning should update status and save', async () => {
        mockAccess.mockResolvedValue(undefined);

        await statusModule.setSchedulerRunning(true);

        expect(mockWriteFile).toHaveBeenCalled();
        const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]);
        expect(writtenData.isSchedulerRunning).toBe(true);
    });
});
