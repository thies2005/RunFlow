/**
 * @jest-environment node
 */
import { readBodyWithLimit, DEFAULT_MAX_BODY_BYTES } from '../bodyLimit';

function requestFromChunks(chunks: string[]): Request {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            for (const chunk of chunks) {
                controller.enqueue(encoder.encode(chunk));
            }
            controller.close();
        },
    });
    return new Request('http://localhost/test', { method: 'POST', body: stream });
}

describe('readBodyWithLimit', () => {
    it('returns the full body when it is under the cap', async () => {
        const body = '{"email":"user@example.com","password":"secret123"}';
        const result = await readBodyWithLimit(requestFromChunks([body]));
        expect(result).toBe(body);
    });

    it('reassembles multi-chunk bodies correctly', async () => {
        const result = await readBodyWithLimit(
            requestFromChunks(['{"email":', '"user@example.com"', ',', '"code":"123456"}']),
            1024,
        );
        expect(result).toBe('{"email":"user@example.com","code":"123456"}');
    });

    it('accepts a body exactly at the cap', async () => {
        const body = 'a'.repeat(1024);
        const result = await readBodyWithLimit(requestFromChunks([body]), 1024);
        expect(result).toBe(body);
    });

    it('returns null when the body exceeds the cap (streamed in many chunks)', async () => {
        const result = await readBodyWithLimit(
            requestFromChunks(['a'.repeat(600), 'b'.repeat(600), 'c'.repeat(600)]),
            1024,
        );
        expect(result).toBe(null);
    });

    it('returns null when a single chunk exceeds the cap', async () => {
        const result = await readBodyWithLimit(
            requestFromChunks(['x'.repeat(DEFAULT_MAX_BODY_BYTES + 1)]),
        );
        expect(result).toBe(null);
    });

    it('returns an empty string for a request without a body', async () => {
        const request = new Request('http://localhost/test', { method: 'GET' });
        const result = await readBodyWithLimit(request);
        expect(result).toBe('');
    });

    it('rejects invalid caps', async () => {
        const request = new Request('http://localhost/test', { method: 'POST', body: 'x' });
        await expect(readBodyWithLimit(request, -1)).rejects.toThrow(RangeError);
        await expect(readBodyWithLimit(request, Number.POSITIVE_INFINITY)).rejects.toThrow(RangeError);
    });

    // Bodies that are already materialized (test doubles and non-standard
    // Request shims expose `.body` as a plain value instead of a stream —
    // jest.setup.ts's MockRequest does). The cap must still be enforced.
    // Regression: these shapes previously threw "getReader is not a function"
    // and took down every route-level 413 test that used a mocked Request.
    function shimRequest(body: unknown): { body: unknown } {
        return { body };
    }

    it('enforces the cap on a materialized string body', async () => {
        const small = await readBodyWithLimit(
            shimRequest('{"email":"a@b.c"}') as unknown as Request,
            1024,
        );
        expect(small).toBe('{"email":"a@b.c"}');

        const oversized = await readBodyWithLimit(
            shimRequest('a'.repeat(1025)) as unknown as Request,
            1024,
        );
        expect(oversized).toBe(null);
    });

    it('enforces the cap on a materialized Uint8Array body', async () => {
        const under = new TextEncoder().encode('{"code":"123456"}');
        const ok = await readBodyWithLimit(shimRequest(under) as unknown as Request, 1024);
        expect(ok).toBe('{"code":"123456"}');

        const over = new TextEncoder().encode('a'.repeat(1025));
        const rejected = await readBodyWithLimit(shimRequest(over) as unknown as Request, 1024);
        expect(rejected).toBe(null);
    });

    it('stringifies and enforces the cap on a materialized object body', async () => {
        const ok = await readBodyWithLimit(
            shimRequest({ email: 'a@b.c' }) as unknown as Request,
            1024,
        );
        expect(ok).toBe('{"email":"a@b.c"}');

        const rejected = await readBodyWithLimit(
            shimRequest({ blob: 'a'.repeat(2048) }) as unknown as Request,
            1024,
        );
        expect(rejected).toBe(null);
    });

    it('counts string bodies in bytes, not UTF-16 code units', async () => {
        // 600 two-byte characters = 1200 bytes > 1024-byte cap.
        const body = 'ä'.repeat(600);
        const result = await readBodyWithLimit(shimRequest(body) as unknown as Request, 1024);
        expect(result).toBe(null);
    });
});
