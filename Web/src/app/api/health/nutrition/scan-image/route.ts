import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { analyzeFoodWithCalorieSnap, calorieSnapErrorResponse } from '@/lib/ai/calorieSnap';
import type { AiImageInput } from '@/lib/ai/providers';
import { detectImageMime } from '@/lib/utils/imageMagic';

const MAX_BASE64_LENGTH = 10 * 1024 * 1024 * 1.4;

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
        }

        if (!body || typeof body !== 'object') {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const { imageBase64, caption } = body as { imageBase64?: unknown; caption?: unknown };
        const captionText = typeof caption === 'string' ? caption : undefined;

        // Enforce a cap on the inbound base64 string length to bound memory use.
        // 10MB of decoded image data, padded for base64 (~33%) overhead.
        if (typeof imageBase64 === 'string' && imageBase64.length > MAX_BASE64_LENGTH) {
            return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 413 });
        }

        // When an image is present, validate its actual content via magic bytes
        // rather than trusting any client-supplied data-URL MIME prefix.
        let image: AiImageInput | undefined;
        if (typeof imageBase64 === 'string' && imageBase64.length > 0) {
            const commaIdx = imageBase64.indexOf(',');
            const b64Payload = (commaIdx >= 0 ? imageBase64.slice(commaIdx + 1) : imageBase64).trim();
            let decodedBuffer: Buffer;
            try {
                decodedBuffer = Buffer.from(b64Payload, 'base64');
            } catch {
                return NextResponse.json({ error: 'Invalid image format' }, { status: 415 });
            }
            const detectedMime = detectImageMime(decodedBuffer);
            if (!detectedMime) {
                return NextResponse.json({ error: 'Invalid image format' }, { status: 415 });
            }
            image = {
                mimeType: detectedMime,
                base64Data: b64Payload,
            };
        }

        if (!image && !captionText?.trim()) {
            return NextResponse.json(
                { error: 'Image or description is required' },
                { status: 400 }
            );
        }

        const result = await analyzeFoodWithCalorieSnap({
            userId,
            image,
            caption: captionText,
            logPrefix: '[Food Scanner]',
        });

        return NextResponse.json(result);
    } catch (error) {
        return calorieSnapErrorResponse(error, '[Food Scanner]');
    }
}
