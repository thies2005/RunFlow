/**
 * @jest-environment node
 *
 * Regression tests for p3: generateHtml-unescaped-workout-fields. The
 * anonymous export endpoint must HTML-escape EVERY caller-supplied plan
 * value interpolated into the text/html response (date, distanceKm,
 * durationMin, pace, week totalDistanceKm joined the already-escaped
 * siblings), and stamp a restrictive CSP + nosniff on the download.
 */
import { POST } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(async () => ({ allowed: true })),
    getClientIdentifier: jest.fn(() => 'test-client'),
    rateLimitHeaders: jest.fn(() => ({})),
}));

function buildRequest(body: unknown): NextRequest {
    return new NextRequest('http://localhost/api/public/plan/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

function benignPlan() {
    return {
        raceType: 'MARATHON',
        raceDate: '2027-06-01',
        weeks: [
            {
                weekNumber: 1,
                phase: 'BASE',
                totalDistanceKm: '42.2',
                workouts: [
                    {
                        date: '2027-03-01',
                        dayOfWeek: 'Mon',
                        type: 'EASY',
                        description: 'Easy aerobic run',
                        displayDescription: 'Easy run',
                        distanceKm: '10.0',
                        durationMin: '60',
                        pace: '6:00',
                        phase: 'BASE',
                        intensityZone: null,
                    },
                ],
            },
        ],
    };
}

const ATTACK_MARKUP = '<script>alert("p3")</script>';
const IMG_ONERROR = '<img src=x onerror=alert(1)>';

function maliciousPlan() {
    const plan = benignPlan();
    plan.weeks[0].workouts[0].date = `p3-date${IMG_ONERROR}`;
    plan.weeks[0].workouts[0].distanceKm = `p3-dist${ATTACK_MARKUP}`;
    plan.weeks[0].workouts[0].durationMin = `p3-dur${ATTACK_MARKUP}`;
    plan.weeks[0].workouts[0].pace = `p3-pace${ATTACK_MARKUP}`;
    plan.weeks[0].totalDistanceKm = `p3-week${ATTACK_MARKUP}`;
    // already-escaped sibling field serves as the control
    plan.weeks[0].workouts[0].description = '<b>p3-escaped-control</b>';
    return plan;
}

describe('POST /api/public/plan/export HTML escaping', () => {
    it('escapes every previously-unescaped workout field in the HTML export', async () => {
        const res = await POST(buildRequest({ format: 'html', plan: maliciousPlan() }));

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
        expect(res.headers.get('content-disposition')).toContain('attachment');
        const html = await res.text();

        // none of the raw markup survives
        expect(html).not.toContain(ATTACK_MARKUP);
        expect(html).not.toContain(IMG_ONERROR);

        // each poisoned field renders escaped, tagged so we know it's the
        // right cell and not an unrelated part of the document
        expect(html).toContain('p3-date&lt;img src=x onerror=alert(1)&gt;');
        expect(html).toContain('p3-dist&lt;script&gt;alert(&quot;p3&quot;)&lt;/script&gt;');
        expect(html).toContain('p3-dur&lt;script&gt;alert(&quot;p3&quot;)&lt;/script&gt;');
        expect(html).toContain('p3-pace&lt;script&gt;alert(&quot;p3&quot;)&lt;/script&gt;');
        expect(html).toContain('p3-week&lt;script&gt;alert(&quot;p3&quot;)&lt;/script&gt; km');

        // control: the sibling field that was already escaped still is
        expect(html).toContain('&lt;b&gt;p3-escaped-control&lt;/b&gt;');
        expect(html).not.toContain('<b>p3-escaped-control</b>');
    });

    it('stamps a restrictive CSP and nosniff on the HTML download', async () => {
        const res = await POST(buildRequest({ format: 'html', plan: benignPlan() }));

        expect(res.status).toBe(200);
        expect(res.headers.get('content-security-policy')).toBe(
            "default-src 'none'; style-src 'unsafe-inline'; img-src data:"
        );
        expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    });

    it('exports a benign plan unchanged (legitimate payload roundtrip)', async () => {
        const res = await POST(buildRequest({ format: 'html', plan: benignPlan() }));

        expect(res.status).toBe(200);
        const html = await res.text();

        // plain values are not altered by the escaping
        expect(html).toContain('2027-03-01');
        expect(html).toContain('10.0');
        expect(html).toContain('60');
        expect(html).toContain('6:00');
        expect(html).toContain('42.2 km');
        expect(html).toContain('MARATHON Training Plan');
    });

    it('keeps the Phase 2 CSV escaping intact and adds nosniff', async () => {
        const plan = benignPlan();
        plan.weeks[0].workouts[0].description = '=HYPERLINK("http://attacker.example", "x")';

        const res = await POST(buildRequest({ format: 'csv', plan }));

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8');
        expect(res.headers.get('x-content-type-options')).toBe('nosniff');
        const csv = await res.text();
        // csvCell neutralizes the formula-leading text with an apostrophe
        expect(csv).toContain("'=HYPERLINK");
        expect(csv).not.toMatch(/,"=[^"]/);
    });

    it('rejects malformed plan payloads with a 400', async () => {
        const res = await POST(buildRequest({ format: 'html', plan: { weeks: 'nope' } }));
        expect(res.status).toBe(400);
    });
});
