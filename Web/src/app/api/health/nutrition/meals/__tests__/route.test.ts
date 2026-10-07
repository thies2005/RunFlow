/**
 * @jest-environment node
 */

import { GET, POST, DELETE } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/auth', () => ({
    auth: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        savedMeal: {
            findMany: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
            findFirst: jest.fn(),
        },
    },
}));

import { auth } from '@/auth';
import { prisma } from '@/lib/db';

const MEALS_URL = 'http://localhost:3000/api/health/nutrition/meals';

describe('/api/health/nutrition/meals', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (auth as jest.Mock).mockResolvedValue(null);
    });

    describe('GET', () => {
        it('should return 401 without authentication', async () => {
            const response = await GET();

            expect(response.status).toBe(401);
            expect(prisma.savedMeal.findMany).not.toHaveBeenCalled();
        });

        it('should query with the session user id and ignore the query-string userId', async () => {
            (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
            (prisma.savedMeal.findMany as jest.Mock).mockResolvedValue([]);

            // GET takes no input at all: a ?userId=victim-user-id query string
            // targeting another user is ignored because the handler never reads it.
            const response = await GET();

            expect(response.status).toBe(200);
            expect(prisma.savedMeal.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { userId: 'user-1' } })
            );
        });
    });

    describe('POST', () => {
        it('should return 401 without authentication', async () => {
            const request = new NextRequest(MEALS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: 'victim-user-id',
                    name: 'Injected Meal',
                    items: [{ name: 'x', calories: 1 }],
                }),
            });

            const response = await POST(request);

            expect(response.status).toBe(401);
            expect(prisma.savedMeal.create).not.toHaveBeenCalled();
        });

        it('should create the meal under the session user, never the body userId', async () => {
            (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
            (prisma.savedMeal.create as jest.Mock).mockResolvedValue({ id: 'meal-1' });

            const request = new NextRequest(MEALS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: 'victim-user-id',
                    name: 'My Meal',
                    items: [{ name: 'Rice', calories: 200 }],
                }),
            });

            const response = await POST(request);

            expect(response.status).toBe(200);
            expect(prisma.savedMeal.create).toHaveBeenCalledWith(
                expect.objectContaining({ data: expect.objectContaining({ userId: 'user-1' }) })
            );
        });

        it('should return 400 when name or items are missing', async () => {
            (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });

            const request = new NextRequest(MEALS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'No items' }),
            });

            const response = await POST(request);

            expect(response.status).toBe(400);
            expect(prisma.savedMeal.create).not.toHaveBeenCalled();
        });
    });

    describe('DELETE', () => {
        it('should return 401 without authentication', async () => {
            const request = new NextRequest(`${MEALS_URL}?id=meal-1`, {
                method: 'DELETE',
            });

            const response = await DELETE(request);

            expect(response.status).toBe(401);
            expect(prisma.savedMeal.delete).not.toHaveBeenCalled();
        });

        it('should scope the ownership lookup to the session user', async () => {
            (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
            (prisma.savedMeal.findFirst as jest.Mock).mockResolvedValue({ id: 'meal-1', userId: 'user-1' });
            (prisma.savedMeal.delete as jest.Mock).mockResolvedValue({});

            const request = new NextRequest(`${MEALS_URL}?id=meal-1`, {
                method: 'DELETE',
            });

            const response = await DELETE(request);

            expect(response.status).toBe(200);
            expect(prisma.savedMeal.findFirst).toHaveBeenCalledWith({
                where: { id: 'meal-1', userId: 'user-1' },
            });
            expect(prisma.savedMeal.delete).toHaveBeenCalledWith({ where: { id: 'meal-1' } });
        });

        it('should return 404 and not delete when the meal belongs to another user', async () => {
            (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
            (prisma.savedMeal.findFirst as jest.Mock).mockResolvedValue(null);

            const request = new NextRequest(`${MEALS_URL}?id=meal-victim`, {
                method: 'DELETE',
            });

            const response = await DELETE(request);

            expect(response.status).toBe(404);
            expect(prisma.savedMeal.delete).not.toHaveBeenCalled();
        });
    });
});
