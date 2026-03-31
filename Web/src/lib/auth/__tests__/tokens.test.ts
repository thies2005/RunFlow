import { generateAuthCode, createAuthCode, verifyAuthCode } from '../tokens';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimit';
import { logger } from '@/lib/logging/logger';
import { AuthCodeType } from '@/generated/prisma/browser';

jest.mock('@/lib/db', () => ({
    prisma: {
        authCode: {
            create: jest.fn(),
            deleteMany: jest.fn(),
            findFirst: jest.fn(),
            delete: jest.fn(),
        },
    },
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimit: jest.fn(),
}));

jest.mock('@/lib/logging/logger', () => ({
    logger: {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
    },
}));

describe('tokens', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateAuthCode', () => {
        it('should generate a code of length 8', () => {
            const code = generateAuthCode();
            expect(code).toHaveLength(8);
        });

        it('should generate a code with allowed characters', () => {
            const code = generateAuthCode();
            const allowedChars = /^[0-9A-Z]{8}$/;
            expect(code).toMatch(allowedChars);
        });

        it('should generate unique codes', () => {
            const codes = new Set();
            for (let i = 0; i < 100; i++) {
                codes.add(generateAuthCode());
            }
            // With 36^6 possible combinations, 100 iterations should be unique
            expect(codes.size).toBe(100);
        });
    });

    describe('createAuthCode', () => {
        it('should generate a code and store it in the database', async () => {
            const email = 'test@example.com';
            const type = AuthCodeType.VERIFY_EMAIL;

            const code = await createAuthCode(email, type);

            expect(code).toHaveLength(8);
            expect(prisma.authCode.deleteMany).toHaveBeenCalledWith({
                where: { email, type }
            });
            expect(prisma.authCode.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    email,
                    code,
                    type,
                    expiresAt: expect.any(Date),
                })
            });
        });
    });

    describe('verifyAuthCode', () => {
        const email = 'test@example.com';
        const code = 'ABC12345';
        const type = AuthCodeType.VERIFY_EMAIL;

        it('should return false if rate limit is exceeded', async () => {
            const checkRateLimitMock = checkRateLimit as jest.Mock;
            checkRateLimitMock.mockReturnValue({ allowed: false });

            const result = await verifyAuthCode(email, code, type);

            expect(result).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith('Rate limit exceeded for auth code verification', { email });
            expect(prisma.authCode.findFirst).not.toHaveBeenCalled();
        });

        it('should return false if record is not found', async () => {
            const checkRateLimitMock = checkRateLimit as jest.Mock;
            checkRateLimitMock.mockReturnValue({ allowed: true });

            const findFirstMock = prisma.authCode.findFirst as jest.Mock;
            findFirstMock.mockResolvedValue(null);

            const result = await verifyAuthCode(email, code, type);

            expect(result).toBe(false);
            expect(prisma.authCode.findFirst).toHaveBeenCalledWith({
                where: {
                    email,
                    type,
                    code: code.toUpperCase(),
                    expiresAt: { gt: expect.any(Date) }
                }
            });
            expect(prisma.authCode.delete).not.toHaveBeenCalled();
        });

        it('should return true and delete record if valid', async () => {
            const checkRateLimitMock = checkRateLimit as jest.Mock;
            checkRateLimitMock.mockReturnValue({ allowed: true });

            const findFirstMock = prisma.authCode.findFirst as jest.Mock;
            const recordId = 'record-123';
            findFirstMock.mockResolvedValue({ id: recordId });

            const result = await verifyAuthCode(email, code, type);

            expect(result).toBe(true);
            expect(prisma.authCode.findFirst).toHaveBeenCalledWith({
                where: {
                    email,
                    type,
                    code: code.toUpperCase(),
                    expiresAt: { gt: expect.any(Date) }
                }
            });
            expect(prisma.authCode.delete).toHaveBeenCalledWith({
                where: { id: recordId }
            });
        });

        it('should handle case-insensitivity of the code', async () => {
            const checkRateLimitMock = checkRateLimit as jest.Mock;
            checkRateLimitMock.mockReturnValue({ allowed: true });

            const findFirstMock = prisma.authCode.findFirst as jest.Mock;
            const recordId = 'record-123';
            findFirstMock.mockResolvedValue({ id: recordId });

            const lowerCaseCode = 'abc12345';
            const result = await verifyAuthCode(email, lowerCaseCode, type);

            expect(result).toBe(true);
            expect(prisma.authCode.findFirst).toHaveBeenCalledWith({
                where: {
                    email,
                    type,
                    code: lowerCaseCode.toUpperCase(),
                    expiresAt: { gt: expect.any(Date) }
                }
            });
        });
    });
});
