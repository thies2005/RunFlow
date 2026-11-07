/** @jest-environment node */
import { NextRequest } from 'next/server';
import { GET } from './route';
import { GET as trampoline } from '@/app/auth/app-callback/route';

describe('self-hosted mobile Strava callback', () => {
    const original = process.env.NEXTAUTH_URL;
    afterAll(() => { if (original === undefined) delete process.env.NEXTAUTH_URL; else process.env.NEXTAUTH_URL = original; });
    it('routes a valid state through the configured host and custom scheme', async () => {
        process.env.NEXTAUTH_URL = 'https://training.example.org';
        const state = `android_${Date.now()}_abcdef`;
        const response = await GET(new NextRequest(`https://training.example.org/api/auth/strava/callback?code=abc&state=${state}`));
        const location = response.headers.get('location')!;
        expect(location).toBe(`https://training.example.org/auth/app-callback?code=abc&state=${state}`);
        const page = await trampoline(new NextRequest(location));
        const html = await page.text();
        expect(html).toContain(`runflow2://auth/callback?code=abc&amp;state=${state}`);
        expect(html).toContain('https://training.example.org/login');
    });
    it('rejects stale mobile state', async () => {
        process.env.NEXTAUTH_URL = 'https://training.example.org';
        const response = await GET(new NextRequest('https://training.example.org/api/auth/strava/callback?code=abc&state=android_1_nonce'));
        expect(response.headers.get('location')).toContain('error=invalid_state');
    });
});
