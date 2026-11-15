import { NextRequest, NextResponse } from 'next/server';
import { analyzeFoodWithCalorieSnap, calorieSnapErrorResponse } from '@/lib/ai/calorieSnap';
import type { AiImageInput } from '@/lib/ai/providers';
import { errorResponses } from '@/lib/api/apiResponse';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { detectImageMime } from '@/lib/utils/imageMagic';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
    let rateLimitResult: Awaited<ReturnType<typeof checkRateLimitAsync>> | undefined;

    try {
        const clientId = getClientIdentifier(request);
        rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);
        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const authUser = await getAuthenticatedUser(request);
        if (!authUser) {
            return errorResponses.unauthorized();
        }

        const userId = authUser.id;
        const formData = await request.formData();
        const imageFile = formData.get('image') as File | null;
        const captionRaw = formData.get('caption');
        const caption = typeof captionRaw === 'string' ? captionRaw : null;

        if (!imageFile && !caption?.trim()) {
            return NextResponse.json(
                { error: 'Image or description is required' },
                { status: 400 }
            );
        }

        let image: AiImageInput | undefined;
        if (imageFile) {
            const buffer = Buffer.from(await imageFile.arrayBuffer());
            if (buffer.length > MAX_IMAGE_BYTES) {
                return NextResponse.json(
                    { error: 'Image too large (max 10MB)' },
                    { status: 413 }
                );
            }

            // Derive the MIME type from the magic bytes rather than trusting the
            // client-supplied imageFile.type, which can be spoofed.
            const detectedMime = detectImageMime(buffer);
            if (!detectedMime) {
                return NextResponse.json(
                    { error: 'Invalid image format' },
                    { status: 415 }
                );
            }

            image = {
                mimeType: detectedMime,
                base64Data: buffer.toString('base64'),
            };
        }

        const result = await analyzeFoodWithCalorieSnap({
            userId,
            image,
            caption,
            logPrefix: '[Mobile Food Scanner]',
        });

        return NextResponse.json(result, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return calorieSnapErrorResponse(
            error,
            '[Mobile Food Scanner]',
            rateLimitResult ? rateLimitHeaders(rateLimitResult) : undefined
        );
    }
}
