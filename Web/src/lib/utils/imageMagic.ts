/**
 * Image magic-byte detection
 *
 * Derives the MIME type of an image from its leading bytes rather than trusting
 * a client-supplied Content-Type / data-URL prefix. Used to validate uploads and
 * to build safe base64 data URLs for AI providers.
 *
 * Supported: JPEG, PNG, GIF, WebP. Returns null for anything else.
 */

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

/**
 * Inspect a buffer's leading bytes and return the detected image MIME type,
 * or null if the buffer does not look like a supported image.
 */
export function detectImageMime(buffer: Buffer): ImageMime | null {
    if (!buffer || buffer.length < 4) return null;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'image/jpeg';
    }

    // PNG: 89 50 4E 47
    if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
    ) {
        return 'image/png';
    }

    // GIF: 47 49 46 ("GIF")
    if (
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46
    ) {
        return 'image/gif';
    }

    // WebP: RIFF header (52 49 46 46) ... "WEBP" at offset 8
    if (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer.length >= 12 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
    ) {
        return 'image/webp';
    }

    return null;
}
