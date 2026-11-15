/**
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({
    prisma: {
        globalAiSettings: {
            findUnique: jest.fn(),
        },
    },
}));

jest.mock('@/lib/logging/logger', () => ({
    logger: {
        warn: jest.fn(),
    },
}));

import { prisma } from '@/lib/db';
import { isEnvSignupsAllowed, getSignupStatus, isSignupAllowed } from '../signupSettings';

describe('signupSettings', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        delete process.env.ALLOW_SIGNUPS;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('isEnvSignupsAllowed', () => {
        it.each(['false', 'no', '0', 'off', 'FALSE', 'NO', ' Off ', ' 0 '])(
            'returns false for disabled value %p',
            (val) => {
                expect(isEnvSignupsAllowed(val)).toBe(false);
            }
        );

        it.each(['true', 'yes', '1', 'on', 'TRUE', 'YES', undefined, '', '   '])(
            'returns true for enabled or unset value %p',
            (val) => {
                expect(isEnvSignupsAllowed(val)).toBe(true);
            }
        );
    });

    describe('getSignupStatus and isSignupAllowed', () => {
        it('returns false (hard no) when ALLOW_SIGNUPS=no even if admin allowSignups is true', async () => {
            process.env.ALLOW_SIGNUPS = 'no';
            (prisma.globalAiSettings.findUnique as jest.Mock).mockResolvedValue({ allowSignups: true });

            const status = await getSignupStatus();
            expect(status).toEqual({
                allowSignups: false,
                envAllowSignups: false,
                adminAllowSignups: true,
            });
            expect(await isSignupAllowed()).toBe(false);
        });

        it('returns true when ALLOW_SIGNUPS=yes and admin allowSignups is true', async () => {
            process.env.ALLOW_SIGNUPS = 'yes';
            (prisma.globalAiSettings.findUnique as jest.Mock).mockResolvedValue({ allowSignups: true });

            const status = await getSignupStatus();
            expect(status).toEqual({
                allowSignups: true,
                envAllowSignups: true,
                adminAllowSignups: true,
            });
            expect(await isSignupAllowed()).toBe(true);
        });

        it('returns false when ALLOW_SIGNUPS=yes and admin allowSignups is false', async () => {
            process.env.ALLOW_SIGNUPS = 'yes';
            (prisma.globalAiSettings.findUnique as jest.Mock).mockResolvedValue({ allowSignups: false });

            const status = await getSignupStatus();
            expect(status).toEqual({
                allowSignups: false,
                envAllowSignups: true,
                adminAllowSignups: false,
            });
            expect(await isSignupAllowed()).toBe(false);
        });

        it('defaults adminAllowSignups to true when GlobalAiSettings row is missing', async () => {
            process.env.ALLOW_SIGNUPS = 'true';
            (prisma.globalAiSettings.findUnique as jest.Mock).mockResolvedValue(null);

            const status = await getSignupStatus();
            expect(status).toEqual({
                allowSignups: true,
                envAllowSignups: true,
                adminAllowSignups: true,
            });
            expect(await isSignupAllowed()).toBe(true);
        });
    });
});
