
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuthCode } from '@/lib/auth/tokens';
import { AuthCodeType } from '@prisma/client';

export async function POST(request: NextRequest) {
    try {
        const { email, code } = await request.json();

        if (!email || !code) {
            return NextResponse.json(
                { error: 'Email and code are required' },
                { status: 400 }
            );
        }

        const isValid = await verifyAuthCode(email, code, AuthCodeType.VERIFY_EMAIL);

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid or expired verification code' },
                { status: 400 }
            );
        }

        // Mark user as verified
        await prisma.user.update({
            where: { email },
            data: {
                emailVerified: new Date(),
                authMethod: 'email' // Ensure auth method is set
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Email verification error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
