
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuthCode } from '@/lib/auth/tokens';
import { hashPassword, validatePassword } from '@/lib/auth/auth-email';
import { AuthCodeType } from '@/generated/prisma/browser';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';
import { readBodyWithLimit } from '@/lib/api/bodyLimit';
import { handleError } from '@/lib/errors/handler';

export async function POST(request: NextRequest) {
    try {
        // Rate limiting check
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, { limit: 5, windowSeconds: 900, prefix: 'reset_pw' }); // 5 attempts per 15 mins

        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const rawBody = await readBodyWithLimit(request);
        if (rawBody === null) {
            return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
        }
        const { email: rawEmail, code, password } = JSON.parse(rawBody);
        const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

        if (!email || typeof code !== 'string' || !code.trim() || typeof password !== 'string' || !password) {
            return NextResponse.json(
                { error: 'Email, code, and new password are required' },
                { status: 400 }
            );
        }

        const pairRateLimit = await checkRateLimitAsync(`${clientId}:${email}`, { limit: 5, windowSeconds: 900, prefix: 'reset_pw_pair' });
        if (!pairRateLimit.allowed) {
            return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const isValid = await verifyAuthCode(email, code, AuthCodeType.PASSWORD_RESET);

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid or expired verification code' },
                { status: 400 }
            );
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return NextResponse.json(
                { error: passwordValidation.errors[0] },
                { status: 400 }
            );
        }

        const passwordHash = await hashPassword(password);

        const runReset = async (tx: typeof prisma) => {
            const updatedUser = await tx.user.update({
                where: { email },
                data: {
                    passwordHash,
                    tokenVersion: { increment: 1 },
                    emailVerified: new Date(),
                },
            });
            if (tx.mcpOAuthToken?.updateMany) {
                await tx.mcpOAuthToken.updateMany({
                    where: { userId: updatedUser.id, revokedAt: null },
                    data: { revokedAt: new Date() },
                });
            }
            if (tx.mcpOAuthCode?.deleteMany) {
                await tx.mcpOAuthCode.deleteMany({
                    where: { userId: updatedUser.id },
                });
            }
        };

        if (typeof prisma.$transaction === 'function') {
            await prisma.$transaction(async (tx) => runReset(tx as typeof prisma));
        } else {
            await runReset(prisma);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        return handleError(error);
    }
}
