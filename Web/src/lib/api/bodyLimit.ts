/**
 * Bounded request-body reading for anonymous (pre-auth) intake routes.
 *
 * p4 remediation for `Web/src/middleware.ts:missing-preauth-body-size-gate`:
 * neither the application nor next@15 enforces a maximum request-body size on
 * App Router route handlers (the framework's limits cover only Server Actions
 * and bodies cloned into middleware), so every anonymous `await
 * request.json()` / `await req.text()` buffered an unbounded body into the
 * shared Node heap before any authentication or signature check ran.
 *
 * `readBodyWithLimit` streams the body chunk-by-chunk and aborts the read as
 * soon as the accumulated byte count exceeds `maxBytes`, returning `null` so
 * the caller can answer 413 without ever materializing the payload. The
 * middleware-level Content-Length gate (see src/middleware.ts) is the cheap
 * first line of defense; this helper is the enforcing bound that also covers
 * lying/absent Content-Length headers and chunked transfers.
 */
export const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

/**
 * Read a request body as text, never buffering more than `maxBytes` bytes.
 *
 * @returns the decoded body text, or `null` when the body exceeded the limit
 * (the stream is cancelled as soon as the cap is crossed).
 */
export async function readBodyWithLimit(
    request: Request,
    maxBytes: number = DEFAULT_MAX_BODY_BYTES,
): Promise<string | null> {
    if (maxBytes < 0 || !Number.isFinite(maxBytes)) {
        throw new RangeError('maxBytes must be a non-negative finite number');
    }
    const body = request.body as unknown;

    if (body == null) {
        return '';
    }

    // Real runtime (undici Requests in Next.js): `body` is a ReadableStream.
    // Stream it chunk-by-chunk and abort as soon as the cap is crossed so an
    // oversized payload is never materialized.
    if (typeof (body as ReadableStream<Uint8Array>).getReader === 'function') {
        const reader = (body as ReadableStream<Uint8Array>).getReader();
        const decoder = new TextDecoder('utf-8');
        const chunks: string[] = [];
        let received = 0;

        try {
            for (;;) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                received += value.byteLength;
                if (received > maxBytes) {
                    // Stop the producer; the caller answers 413 without the rest.
                    await reader.cancel().catch(() => {});
                    return null;
                }
                chunks.push(decoder.decode(value, { stream: true }));
            }
        } finally {
            reader.releaseLock();
        }

        chunks.push(decoder.decode());
        return chunks.join('');
    }

    // Already-materialized bodies (test doubles and non-standard Request
    // shims expose `body` as a plain value instead of a stream). The payload
    // already exists in memory, so the cap cannot prevent the buffering —
    // but it is still enforced on the byte length so the caller answers 413.
    const encoder = new TextEncoder();
    if (typeof body === 'string') {
        return encoder.encode(body).length > maxBytes ? null : body;
    }
    if (body instanceof Uint8Array) {
        if (body.byteLength > maxBytes) {
            return null;
        }
        return new TextDecoder('utf-8').decode(body);
    }
    const materialized = JSON.stringify(body);
    return encoder.encode(materialized).length > maxBytes ? null : materialized;
}
