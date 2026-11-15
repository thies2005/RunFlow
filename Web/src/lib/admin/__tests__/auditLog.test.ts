import { logAdminAction } from '../auditLog';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logging/logger';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/db', () => ({
    prisma: {
        adminAuditLog: {
            create: jest.fn(),
        },
    },
}));

jest.mock('@/lib/logging/logger', () => ({
    logger: {
        error: jest.fn(),
    },
}));

describe('logAdminAction', () => {
    const originalEnv = process.env;
    let mockReq: NextRequest;
    let mockHeaders: Map<string, string>;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        delete process.env.TRUSTED_PROXY_COUNT;
        delete process.env.TRUSTED_CLIENT_IP_HEADER;

        // Setup mock headers map
        mockHeaders = new Map();

        // Setup mock NextRequest
        mockReq = {
            headers: {
                get: jest.fn((key: string) => mockHeaders.get(key) || null),
            },
        } as unknown as NextRequest;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should ignore spoofed x-forwarded-for when TRUSTED_PROXY_COUNT is unset', async () => {
        mockHeaders.set('x-forwarded-for', '192.168.1.1, 10.0.0.1');
        mockHeaders.set('user-agent', 'Mozilla/5.0');

        const action = 'VIEW_USERS';
        const target = { type: 'USER' as const, id: 'user-123' };
        const details = { reason: 'audit' };

        await logAdminAction(mockReq, action, target, details);

        expect(prisma.adminAuditLog.create).toHaveBeenCalledTimes(1);
        expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
            data: {
                adminUser: 'SYSTEM_ADMIN',
                action: 'VIEW_USERS',
                targetType: 'USER',
                targetId: 'user-123',
                details: JSON.stringify({ reason: 'audit' }),
                ipAddress: 'unknown',
                userAgent: 'Mozilla/5.0',
            },
        });
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('should extract right-aligned client IP when TRUSTED_PROXY_COUNT=1', async () => {
        process.env.TRUSTED_PROXY_COUNT = '1';
        mockHeaders.set('x-forwarded-for', '1.2.3.4, 203.0.113.5');
        mockHeaders.set('user-agent', 'Mozilla/5.0');

        await logAdminAction(mockReq, 'VIEW_USERS');

        expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                ipAddress: '203.0.113.5',
                userAgent: 'Mozilla/5.0',
            }),
        });
    });

    it('should fallback to x-real-ip when TRUSTED_PROXY_COUNT=1 and x-forwarded-for is missing', async () => {
        // Arrange
        process.env.TRUSTED_PROXY_COUNT = '1';
        mockHeaders.set('x-real-ip', '10.0.0.2');
        mockHeaders.set('user-agent', 'TestAgent');

        // Act
        await logAdminAction(mockReq, 'VIEW_SYSTEM_STATS');

        // Assert
        expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                ipAddress: '10.0.0.2',
                userAgent: 'TestAgent',
            }),
        });
    });

    it('should use unknown for missing headers and handle missing target/details', async () => {
        // Arrange - No headers set

        // Act
        await logAdminAction(mockReq, 'RECALCULATE_FITNESS');

        // Assert
        expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
            data: {
                adminUser: 'SYSTEM_ADMIN',
                action: 'RECALCULATE_FITNESS',
                targetType: undefined,
                targetId: undefined,
                details: null,
                ipAddress: 'unknown',
                userAgent: 'unknown',
            },
        });
    });

    it('should handle target without id', async () => {
        // Arrange
        const target = { type: 'SYSTEM' as const };

        // Act
        await logAdminAction(mockReq, 'VIEW_SYSTEM_STATS', target);

        // Assert
        expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                targetType: 'SYSTEM',
                targetId: undefined,
            }),
        });
    });

    it('should catch and log errors without throwing', async () => {
        // Arrange
        const testError = new Error('Database connection failed');
        (prisma.adminAuditLog.create as jest.Mock).mockRejectedValueOnce(testError);

        // Act
        await expect(logAdminAction(mockReq, 'DELETE_USER')).resolves.not.toThrow();

        // Assert
        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith('Failed to write admin audit log', {
            action: 'DELETE_USER',
            error: 'Database connection failed',
        });
    });

    it('should handle non-Error objects being thrown', async () => {
        // Arrange
        (prisma.adminAuditLog.create as jest.Mock).mockRejectedValueOnce('Some string error');

        // Act
        await expect(logAdminAction(mockReq, 'DELETE_USER')).resolves.not.toThrow();

        // Assert
        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith('Failed to write admin audit log', {
            action: 'DELETE_USER',
            error: 'Some string error',
        });
    });
});
