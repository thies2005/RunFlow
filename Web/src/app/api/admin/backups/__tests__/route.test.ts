/**
 * @jest-environment node
 */

import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/admin/auth', () => ({
    requireAdmin: jest.fn(),
}));

jest.mock('@/lib/security/csrf', () => ({
    validateCsrfToken: jest.fn(() => true),
    csrfValidationErrorResponse: jest.fn(() => new Response(JSON.stringify({ error: 'CSRF validation failed' }), { status: 403 })),
}));

jest.mock('@/lib/rateLimitAdmin', () => ({
    adminRateLimit: jest.fn(),
    applyRateLimitHeaders: jest.fn((response) => response),
}));

jest.mock('@/lib/backup/scheduler', () => ({
    createBackup: jest.fn(),
    restoreBackup: jest.fn(),
    listBackups: jest.fn(),
    cleanupOldBackups: jest.fn(),
}));

import { requireAdmin } from '@/lib/admin/auth';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { validateCsrfToken, csrfValidationErrorResponse } from '@/lib/security/csrf';
import { createBackup, restoreBackup, listBackups, cleanupOldBackups } from '@/lib/backup/scheduler';

describe('GET /api/admin/backups', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (requireAdmin as jest.Mock).mockResolvedValue({ admin: { username: 'test-admin', type: 'admin' } });
        (adminRateLimit as jest.Mock).mockResolvedValue({
            success: true,
            result: { remaining: 10, reset: Date.now() + 60000 },
        });
        (listBackups as jest.Mock).mockReturnValue([
            {
                name: 'backup1.sql.gz',
                size: 1024 * 1024,
                createdAt: new Date(),
                type: 'full',
            },
            {
                name: 'backup2.sql',
                size: 512 * 1024,
                createdAt: new Date(),
                type: 'incremental',
            },
        ]);
    });

    it('should handle successful request', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/backups');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('backups');
        expect(data.backups).toHaveLength(2);
    });

    it('should return 401 when not admin', async () => {
        (requireAdmin as jest.Mock).mockResolvedValue({
            error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/backups');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');

        expect(response.status).toBe(401);
    });

    it('should enforce rate limiting', async () => {
        (adminRateLimit as jest.Mock).mockResolvedValue({
            success: false,
            error: new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/backups');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');

        expect(response.status).toBe(429);
    });

    it('should format file sizes', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/backups');

        const response = await GET(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(data.backups[0].sizeFormatted).toBe('1 MB');
        expect(data.backups[1].sizeFormatted).toBe('512 KB');
    });

    it('should apply rate limit headers', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/backups');

        const response = await GET(mockRequest);

        expect(applyRateLimitHeaders).toHaveBeenCalled();
    });
});

describe('POST /api/admin/backups', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (requireAdmin as jest.Mock).mockResolvedValue({ admin: { username: 'test-admin', type: 'admin' } });
        (adminRateLimit as jest.Mock).mockResolvedValue({
            success: true,
            result: { remaining: 10, reset: Date.now() + 60000 },
        });
        (validateCsrfToken as jest.Mock).mockReturnValue(true);
    });

    it('should handle create action', async () => {
        (createBackup as jest.Mock).mockResolvedValue({
            name: 'backup3.sql.gz',
            size: 2048 * 1024,
            createdAt: new Date(),
            type: 'full',
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/backups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create' }),
        });

        const response = await POST(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('backup');
        expect(createBackup).toHaveBeenCalled();
    });

    it('should handle restore action', async () => {
        (restoreBackup as jest.Mock).mockResolvedValue(undefined);

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/backups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'restore', backupName: 'backup1.sql.gz' }),
        });

        const response = await POST(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('success', true);
        expect(restoreBackup).toHaveBeenCalledWith('backup1.sql.gz');
    });

    it('should handle cleanup action', async () => {
        (cleanupOldBackups as jest.Mock).mockResolvedValue({
            deleted: 5,
            freedSpace: 5 * 1024 * 1024,
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/backups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'cleanup' }),
        });

        const response = await POST(mockRequest);
        if (!response) throw new Error('Response is undefined');
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('cleanup');
        expect(cleanupOldBackups).toHaveBeenCalled();
    });

    it('should return 403 for invalid CSRF token', async () => {
        (validateCsrfToken as jest.Mock).mockReturnValue(false);

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/backups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create' }),
        });

        const response = await POST(mockRequest);
        if (!response) throw new Error('Response is undefined');

        expect(response.status).toBe(403);
    });

    it('should return 401 when not admin', async () => {
        (requireAdmin as jest.Mock).mockResolvedValue({
            error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/backups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create' }),
        });

        const response = await POST(mockRequest);
        if (!response) throw new Error('Response is undefined');

        expect(response.status).toBe(401);
    });

    it('should enforce rate limiting', async () => {
        (adminRateLimit as jest.Mock).mockResolvedValue({
            success: false,
            error: new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/backups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create' }),
        });

        const response = await POST(mockRequest);
        if (!response) throw new Error('Response is undefined');

        expect(response.status).toBe(429);
    });

    it('should return 400 for invalid action', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/backups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'invalid' }),
        });

        const response = await POST(mockRequest);
        if (!response) throw new Error('Response is undefined');

        expect(response.status).toBe(400);
    });

    it('should return 400 for missing action', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/backups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(mockRequest);
        if (!response) throw new Error('Response is undefined');

        expect(response.status).toBe(400);
    });

    it('should return 400 for restore without backupName', async () => {
        const mockRequest = new NextRequest('http://localhost:3000/api/admin/backups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'restore' }),
        });

        const response = await POST(mockRequest);
        if (!response) throw new Error('Response is undefined');

        expect(response.status).toBe(400);
    });

    it('should apply rate limit headers', async () => {
        (createBackup as jest.Mock).mockResolvedValue({
            name: 'backup3.sql.gz',
            size: 1024,
            createdAt: new Date(),
            type: 'full',
        });

        const mockRequest = new NextRequest('http://localhost:3000/api/admin/backups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create' }),
        });

        const response = await POST(mockRequest);

        expect(applyRateLimitHeaders).toHaveBeenCalled();
    });
});
