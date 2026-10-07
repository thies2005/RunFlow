/**
 * @jest-environment node
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/plans', () => ({
    generateTrainingPlan: jest.fn(),
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(),
    rateLimitHeaders: jest.fn(() => ({})),
    getClientIdentifier: jest.fn(() => 'test-client'),
}));

import { generateTrainingPlan } from '@/lib/plans';
import { checkRateLimitAsync } from '@/lib/rateLimit';

const ROUTE_URL = 'http://localhost:3000/api/public/plan/generate';

function planRequest(raceDate: string) {
    return new NextRequest(ROUTE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            raceType: 'MARATHON',
            raceDate,
            fitnessLevel: 'intermediate',
            runsPerWeek: 7,
            weeklyVolumeKm: 200,
        }),
    });
}

describe('POST /api/public/plan/generate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({
            allowed: true,
            limit: 10,
            remaining: 9,
        });
        (generateTrainingPlan as jest.Mock).mockReturnValue([]);
    });

    it('rejects a race date beyond the maximum plan horizon', async () => {
        const response = await POST(planRequest('9999-12-31'));

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('too far');
        expect(generateTrainingPlan).not.toHaveBeenCalled();
    });

    it('accepts a race date within the horizon and generates the plan', async () => {
        const raceDate = new Date(Date.now() + 52 * 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

        const response = await POST(planRequest(raceDate));

        expect(response.status).toBe(200);
        expect(generateTrainingPlan).toHaveBeenCalledTimes(1);
        const config = (generateTrainingPlan as jest.Mock).mock.calls[0][0];
        expect(config.raceDate).toEqual(new Date(raceDate));
    });

    it('still rejects a past race date', async () => {
        const response = await POST(planRequest('2000-01-01'));

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('future');
        expect(generateTrainingPlan).not.toHaveBeenCalled();
    });
});
