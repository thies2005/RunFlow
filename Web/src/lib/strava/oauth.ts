import { prisma } from '@/lib/db';
import { encryptToken, decryptToken } from '@/lib/crypto';
import { logger } from '@/lib/logging/logger';

function tryDecryptOrPlaintext(token: string | null | undefined, tokenType: 'access' | 'refresh', userId: string): string | null {
    if (!token) {
        return null;
    }

    try {
        return decryptToken(token);
    } catch (error) {
        logger.warn('Falling back to legacy plaintext Strava token', {
            userId,
            tokenType,
            error: error instanceof Error ? error.message : String(error),
        });
        return token;
    }
}

export async function refreshStravaToken(userId: string): Promise<string | null> {
    const account = await prisma.account.findFirst({
        where: {
            userId: userId,
            provider: 'strava'
        }
    });

    if (!account?.refresh_token) {
        return null;
    }

    const decryptedRefreshToken = tryDecryptOrPlaintext(account.refresh_token, 'refresh', userId);

    if (!decryptedRefreshToken) {
        logger.error('Failed to decrypt refresh token, forcing re-authentication', { userId });
        return null;
    }

    if (account.expires_at && account.expires_at * 1000 > Date.now() + 5 * 60 * 1000) {
        return tryDecryptOrPlaintext(account.access_token, 'access', userId);
    }

    const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: decryptedRefreshToken,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to refresh Strava token: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    await prisma.account.update({
        where: {
            id: account.id
        },
        data: {
            access_token: encryptToken(data.access_token),
            refresh_token: encryptToken(data.refresh_token),
            expires_at: data.expires_at,
        },
    });

    return data.access_token;
}
