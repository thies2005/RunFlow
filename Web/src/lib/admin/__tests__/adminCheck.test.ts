import { isAdmin } from '../adminCheck';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
        },
    },
}));

describe('adminCheck', () => {
    const originalEnv = process.env;
    let mockFindUnique: jest.Mock;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        mockFindUnique = prisma.user.findUnique as jest.Mock;
        mockFindUnique.mockReset();
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('isAdmin', () => {
        describe('basic checks', () => {
            test('returns false for null', async () => {
                const result = await isAdmin(null);
                expect(result).toBe(false);
            });

            test('returns false for undefined', async () => {
                const result = await isAdmin(undefined);
                expect(result).toBe(false);
            });

            test('returns false for empty string', async () => {
                const result = await isAdmin('');
                expect(result).toBe(false);
            });
        });

        describe('environment variable checks', () => {
            test('returns true when email matches ADMIN_EMAIL exactly', async () => {
                process.env.ADMIN_EMAIL = 'admin@example.com';
                const result = await isAdmin('admin@example.com');
                expect(result).toBe(true);
            });

            test('returns true when email matches ADMIN_EMAIL case-insensitively', async () => {
                process.env.ADMIN_EMAIL = 'Admin@Example.com';
                const result = await isAdmin('ADMIN@EXAMPLE.COM');
                expect(result).toBe(true);
            });

            test('returns true when email matches one in ADMIN_EMAILS list', async () => {
                process.env.ADMIN_EMAILS = 'admin1@test.com,admin2@test.com,admin3@test.com';
                const result = await isAdmin('admin2@test.com');
                expect(result).toBe(true);
            });

            test('returns true when email matches one in ADMIN_EMAILS list with whitespace', async () => {
                process.env.ADMIN_EMAILS = ' admin1@test.com , admin2@test.com , admin3@test.com ';
                const result = await isAdmin('admin2@test.com');
                expect(result).toBe(true);
            });

            test('returns true when email matches one in ADMIN_EMAILS list case-insensitively', async () => {
                process.env.ADMIN_EMAILS = 'Admin1@Test.com,Admin2@Test.com';
                const result = await isAdmin('admin1@test.com');
                expect(result).toBe(true);
            });

            test('returns false when email is not in env vars', async () => {
                process.env.ADMIN_EMAIL = 'admin@example.com';
                process.env.ADMIN_EMAILS = 'admin1@test.com,admin2@test.com';
                // Need to mock db as false since env check falls through
                mockFindUnique.mockResolvedValue(null);

                const result = await isAdmin('notadmin@example.com');
                expect(result).toBe(false);
            });
        });

        describe('database checks', () => {
            beforeEach(() => {
                // Clear env vars for these tests
                delete process.env.ADMIN_EMAIL;
                delete process.env.ADMIN_EMAILS;
            });

            test('returns true when user is admin in database', async () => {
                mockFindUnique.mockResolvedValue({ isAdmin: true });
                const result = await isAdmin('dbadmin@example.com');
                expect(result).toBe(true);
                expect(mockFindUnique).toHaveBeenCalledWith({
                    where: { email: 'dbadmin@example.com' },
                    select: { isAdmin: true }
                });
            });

            test('returns false when user is not admin in database', async () => {
                mockFindUnique.mockResolvedValue({ isAdmin: false });
                const result = await isAdmin('dbuser@example.com');
                expect(result).toBe(false);
                expect(mockFindUnique).toHaveBeenCalledWith({
                    where: { email: 'dbuser@example.com' },
                    select: { isAdmin: true }
                });
            });

            test('returns false when user is not found in database', async () => {
                mockFindUnique.mockResolvedValue(null);
                const result = await isAdmin('nonexistent@example.com');
                expect(result).toBe(false);
            });

            test('returns false when database query throws an error', async () => {
                mockFindUnique.mockRejectedValue(new Error('Database error'));
                const result = await isAdmin('error@example.com');
                expect(result).toBe(false);
            });

            test('checks database with lowercase email', async () => {
                mockFindUnique.mockResolvedValue({ isAdmin: true });
                const result = await isAdmin('MixED@caSE.com');
                expect(result).toBe(true);
                expect(mockFindUnique).toHaveBeenCalledWith({
                    where: { email: 'mixed@case.com' },
                    select: { isAdmin: true }
                });
            });
        });
    });
});
