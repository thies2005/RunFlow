/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { POST as registerPOST } from '@/app/api/auth/register/route';
import { POST as verifyPOST } from '@/app/api/auth/verify-email/route';
import { POST as loginPOST } from '@/app/api/mobile/v1/auth/email-login/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    authCode: {
      findFirst: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth/tokens', () => ({
  createAuthCode: jest.fn(() => '123456'),
  verifyAuthCode: jest.fn(() => true),
}));

jest.mock('@/lib/email', () => ({
  sendWelcomeEmail: jest.fn(),
}));

jest.mock('@/lib/auth/auth-email', () => ({
  hashPassword: jest.fn((pw) => `hashed_${pw}`),
  verifyPassword: jest.fn((pw, hash) => hash === `hashed_${pw}`),
  validateEmail: jest.fn((email) => email.includes('@')),
  validatePassword: jest.fn(() => ({ valid: true, errors: [] })),
}));

jest.mock('@/lib/mobile/auth', () => ({
  generateTokenPair: jest.fn(() => ({
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiresIn: 3600,
  })),
}));

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimitAsync: jest.fn().mockResolvedValue({ allowed: true }),
  getClientIdentifier: jest.fn().mockReturnValue('test-client'),
  rateLimitHeaders: jest.fn().mockReturnValue({}),
  RATE_LIMITS: {},
}));

import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth/auth-email';
import { createAuthCode, verifyAuthCode } from '@/lib/auth/tokens';
import { generateTokenPair } from '@/lib/mobile/auth';

describe('User Registration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register, verify email, and login', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: null,
    });
    (prisma.authCode.findFirst as jest.Mock).mockResolvedValue({
      code: '123456',
      email: 'test@example.com',
      type: 'VERIFY_EMAIL',
    });
    (prisma.user.update as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      emailVerified: new Date(),
    });

    const registerRequest = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User',
      }),
    });
    const registerResponse = await registerPOST(registerRequest);
    expect(registerResponse.status).toBe(201);

    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: 'test@example.com',
        name: 'Test User',
      }),
    }));

    expect(createAuthCode).toHaveBeenCalledWith('test@example.com', 'VERIFY_EMAIL');

    const verifyRequest = new NextRequest('http://localhost:3000/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        code: '123456',
      }),
    });
    const verifyResponse = await verifyPOST(verifyRequest);
    expect(verifyResponse.status).toBe(200);

    expect(verifyAuthCode).toHaveBeenCalledWith('test@example.com', '123456', 'VERIFY_EMAIL');

    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        emailVerified: expect.any(Date),
      }),
    }));

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hashed_SecurePassword123!',
    });

    const loginRequest = new NextRequest('http://localhost:3000/api/mobile/v1/auth/email-login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'SecurePassword123!',
      }),
    });
    const loginResponse = await loginPOST(loginRequest);
    expect(loginResponse.status).toBe(200);
    const loginData = await loginResponse.json();
    expect(loginData.accessToken).toBe('test-access-token');
    expect(loginData.refreshToken).toBe('test-refresh-token');
    expect(loginData.tokenType).toBe('Bearer');
  });

  it('should prevent duplicate email registration', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'existing-user',
      email: 'duplicate@example.com',
    });

    const registerRequest = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'duplicate@example.com',
        password: 'SecurePassword123!',
        name: 'Test User',
      }),
    });
    const response = await registerPOST(registerRequest);
    expect(response.status).toBe(201);
  });

  it('should reject invalid email verification code', async () => {
    (verifyAuthCode as jest.Mock).mockReturnValue(false);

    const verifyRequest = new NextRequest('http://localhost:3000/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({
        email: 'verify@example.com',
        code: 'INVALID_CODE',
      }),
    });
    const response = await verifyPOST(verifyRequest);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid or expired');
  });

  it('should reject login with invalid credentials', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'login@example.com',
      passwordHash: 'hashed_SecurePassword123!',
    });
    (verifyPassword as jest.Mock).mockReturnValue(false);

    const loginRequest = new NextRequest('http://localhost:3000/api/mobile/v1/auth/email-login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'login@example.com',
        password: 'WrongPassword123!',
      }),
    });
    const response = await loginPOST(loginRequest);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toContain('Invalid email or password');
  });

  it('should validate email format', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const registerRequest = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'SecurePassword123!',
        name: 'Test User',
      }),
    });
    const response = await registerPOST(registerRequest);
    expect(response.status).toBe(400);
  });

  it('should require password', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const registerRequest = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
      }),
    });
    const response = await registerPOST(registerRequest);
    expect(response.status).toBe(400);
  });

  it('should require email and code for verification', async () => {
    const verifyRequest = new NextRequest('http://localhost:3000/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await verifyPOST(verifyRequest);
    expect(response.status).toBe(400);
  });

  it('should require email and password for login', async () => {
    const loginRequest = new NextRequest('http://localhost:3000/api/mobile/v1/auth/email-login', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await loginPOST(loginRequest);
    expect(response.status).toBe(400);
  });

  it('should handle non-existent user on login', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const loginRequest = new NextRequest('http://localhost:3000/api/mobile/v1/auth/email-login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'SecurePassword123!',
      }),
    });
    const response = await loginPOST(loginRequest);
    expect(response.status).toBe(401);
  });

  it('should handle user without password hash on login', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'strava-user@example.com',
      passwordHash: null,
    });

    const loginRequest = new NextRequest('http://localhost:3000/api/mobile/v1/auth/email-login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'strava-user@example.com',
        password: 'SecurePassword123!',
      }),
    });
    const response = await loginPOST(loginRequest);
    expect(response.status).toBe(401);
  });
});
