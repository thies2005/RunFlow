/**
 * Mobile Registration Endpoint
 * 
 * POST /api/mobile/v1/auth/register
 * Creates a new user account via mobile app and returns JWT tokens.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, validateEmail, validatePassword } from '@/lib/auth/auth-email';
import { generateTokenPair } from '@/lib/mobile/auth';
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
    try {
        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, {
            limit: 5,
            windowSeconds: 60,
            prefix: 'mobile-register'
        });

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const body = await request.json();
        const { email, password, name } = body;

        // Validate email
        if (!email || typeof email !== 'string' || !validateEmail(email)) {
            return NextResponse.json(
                { error: 'Please enter a valid email address' },
                { status: 400 }
            );
        }

        // Validate password
        if (!password || typeof password !== 'string') {
            return NextResponse.json(
                { error: 'Password is required' },
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

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'Registration failed. Please try again or contact support.' },
                { status: 400 }
            );
        }

        // Create user with hashed password
        const passwordHash = await hashPassword(password);
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                name: name || null,
                passwordHash,
                authMethod: 'email',
            },
            select: {
                id: true,
                email: true,
                name: true,
                image: true,
                tokenVersion: true
            }
        });

        // Generate JWT tokens
        const tokens = await generateTokenPair(user.id, user.tokenVersion);

        return NextResponse.json({
            ...tokens,
            tokenType: 'Bearer',
            user
        }, { status: 201, headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        console.error('[Mobile Auth] Register error:', error);
        return NextResponse.json(
            { error: 'Failed to create account' },
            { status: 500 }
        );
    }
}
