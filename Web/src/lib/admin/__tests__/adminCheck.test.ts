import { isAdmin } from '../adminCheck';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
        },
    },
}));

describe('Admin Check', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        (prisma.user.findUnique as jest.Mock).mockReset();
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('isAdmin', () => {
        it('returns false when email is null', async () => {
            const result = await isAdmin(null);
            expect(result).toBe(false);
            expect(prisma.user.findUnique).not.toHaveBeenCalled();
        });

        it('returns false when email is undefined', async () => {
            const result = await isAdmin(undefined);
            expect(result).toBe(false);
            expect(prisma.user.findUnique).not.toHaveBeenCalled();
        });

        it('returns false when email is empty string', async () => {
            const result = await isAdmin('');
            expect(result).toBe(false);
            expect(prisma.user.findUnique).not.toHaveBeenCalled();
        });

        it('returns true when email matches process.env.ADMIN_EMAIL exactly', async () => {
            process.env.ADMIN_EMAIL = 'admin@example.com';
            const result = await isAdmin('admin@example.com');
            expect(result).toBe(true);
            expect(prisma.user.findUnique).toHaveBeenCalled(); // Since isAdmin evaluates both functions
        });

        it('returns true when email matches process.env.ADMIN_EMAIL with different casing', async () => {
            process.env.ADMIN_EMAIL = 'ADMIN@example.com';
            const result = await isAdmin('admin@EXAMPLE.com');
            expect(result).toBe(true);
            expect(prisma.user.findUnique).toHaveBeenCalled();
        });

        it('returns true when email is in process.env.ADMIN_EMAILS comma-separated list', async () => {
            process.env.ADMIN_EMAILS = 'other@example.com, admin@example.com, test@example.com';
            const result = await isAdmin('admin@example.com');
            expect(result).toBe(true);
            expect(prisma.user.findUnique).toHaveBeenCalled();
        });

        it('handles spaces in process.env.ADMIN_EMAILS correctly', async () => {
            process.env.ADMIN_EMAILS = 'other@example.com , admin@example.com ,  test@example.com';
            const result = await isAdmin('admin@example.com');
            expect(result).toBe(true);
            expect(prisma.user.findUnique).toHaveBeenCalled();
        });

        it('returns true when user is marked as admin in the database', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isAdmin: true });
            const result = await isAdmin('dbadmin@example.com');

            expect(result).toBe(true);
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: 'dbadmin@example.com' },
                select: { isAdmin: true }
            });
        });

        it('returns false when user is found in the database but not an admin', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isAdmin: false });
            const result = await isAdmin('user@example.com');

            expect(result).toBe(false);
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: 'user@example.com' },
                select: { isAdmin: true }
            });
        });

        it('returns false when user is not found in the database', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
            const result = await isAdmin('unknown@example.com');

            expect(result).toBe(false);
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: 'unknown@example.com' },
                select: { isAdmin: true }
            });
        });

        it('returns false when database query throws an error', async () => {
            (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));
            const result = await isAdmin('error@example.com');

            expect(result).toBe(false);
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: 'error@example.com' },
                select: { isAdmin: true }
            });
        });
    });
});
