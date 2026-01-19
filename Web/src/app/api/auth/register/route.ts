/**
 * Email Registration API Endpoint
 * 
 * POST /api/auth/register
 * Creates a new user account with email and password.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, validateEmail, validatePassword } from '@/lib/auth/auth-email';
import { createAuthCode } from '@/lib/auth/tokens';
import { sendWelcomeEmail } from '@/lib/email';
import { AuthCodeType } from '@prisma/client';

export async function POST(request: NextRequest) {
    try {
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
                { error: 'An account with this email already exists' },
                { status: 409 }
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
            }
        });

        // Generate and send verification code
        try {
            const code = await createAuthCode(user.email!, AuthCodeType.VERIFY_EMAIL);
            await sendWelcomeEmail(user.email!, code);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // We don't fail the request, but the user will need to request a new code later
        }

        return NextResponse.json({
            success: true,
            message: 'Account created successfully',
            user
        }, { status: 201 });

    } catch (error) {
        console.error('[Auth Register] Error:', error);
        return NextResponse.json(
            { error: 'Failed to create account' },
            { status: 500 }
        );
    }
}
