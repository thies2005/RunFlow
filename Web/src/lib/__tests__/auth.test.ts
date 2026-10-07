/**
 * @jest-environment node
 *
 * Regression tests for the p2a auth-cluster fixes:
 * 1. email-keyed login throttle pre-verify lockout (authorize must only count
 *    FAILED verifications, keyed per client + email)
 * 2. web JWT session revocation on tokenVersion bump (password reset /
 *    mobile logout)
 * 3. fail-closed Strava token encryption (missing ENCRYPTION_KEY must abort
 *    sign-in instead of persisting plaintext)
 *
 * The ESM-only next-auth packages are mocked; the module under test is the
 * real Web/src/auth.ts config (exported as authConfigObject).
 */
import { randomBytes } from 'crypto';
import { decryptToken } from '@/lib/crypto';

// ---------------------------------------------------------------------------
// Mocks (hoisted)
// ---------------------------------------------------------------------------
const mockUserFindUnique = jest.fn();
const mockAccountFindUnique = jest.fn();
const mockAccountFindFirst = jest.fn();
const mockAccountUpdate = jest.fn();
const mockUserUpdate = jest.fn();
const mockVerifyPassword = jest.fn();
const mockGenerateTokenPair = jest.fn();

jest.mock('@/lib/db', () => ({
    prisma: {
        user: {
            findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
            update: (...args: unknown[]) => mockUserUpdate(...args),
        },
        account: {
            findUnique: (...args: unknown[]) => mockAccountFindUnique(...args),
            findFirst: (...args: unknown[]) => mockAccountFindFirst(...args),
            update: (...args: unknown[]) => mockAccountUpdate(...args),
        },
    },
}));

jest.mock('@/lib/auth/auth-email', () => ({
    verifyPassword: (...args: unknown[]) => mockVerifyPassword(...args),
}));

jest.mock('@/lib/logging/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('next-auth', () => ({
    __esModule: true,
    default: jest.fn(() => ({ handlers: {}, auth: jest.fn(), signIn: jest.fn(), signOut: jest.fn() })),
}));

jest.mock('next-auth/providers/strava', () => ({
    __esModule: true,
    default: jest.fn((opts: Record<string, unknown>) => ({ id: 'strava', name: 'Strava', ...opts })),
}));

jest.mock('next-auth/providers/credentials', () => ({
    __esModule: true,
    default: jest.fn((opts: Record<string, unknown>) => ({ id: 'credentials', name: 'Credentials', ...opts })),
}));

jest.mock('@auth/prisma-adapter', () => ({
    __esModule: true,
    PrismaAdapter: jest.fn(() => ({ getUserByAccount: jest.fn(), linkAccount: jest.fn() })),
}));

// ---------------------------------------------------------------------------
// Typed accessors into the real auth config
// ---------------------------------------------------------------------------
import { authConfigObject } from '@/auth';

type CredentialsProviderLike = {
    id: string;
    authorize: (credentials: Partial<Record<string, unknown>> | undefined, request: Request) => Promise<unknown>;
};

type Callbacks = {
    signIn: (params: { account?: Record<string, unknown> }) => Promise<boolean>;
    jwt: (params: { token: Record<string, unknown>; user?: { id: string } }) => Promise<Record<string, unknown>>;
    session: (params: {
        session: { user: Record<string, unknown> };
        token?: Record<string, unknown>;
        user?: Record<string, unknown>;
    }) => Promise<{ user: Record<string, unknown> }>;
};

const callbacks = (authConfigObject as unknown as { callbacks: Callbacks }).callbacks;
const credentialsProvider = (authConfigObject as unknown as { providers: CredentialsProviderLike[] })
    .providers.find((p) => p.id === 'credentials') as CredentialsProviderLike;

const VICTIM_EMAIL = 'victim@example.com';

function loginRequest(clientIp: string): Request {
    return new Request('http://localhost/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            // single trusted appending proxy in front (default hops = 1)
            'x-forwarded-for': `spoofable-leftmost, ${clientIp}`,
            'user-agent': 'test-agent',
        },
    });
}

function seedUser(overrides: Record<string, unknown> = {}) {
    return {
        id: 'user-1',
        email: VICTIM_EMAIL,
        name: 'Victim',
        image: null,
        passwordHash: '$2a$12$hash',
        tokenVersion: 0,
        authMethod: 'email',
        lastSyncAt: null,
        ...overrides,
    };
}

describe('auth.ts security regressions', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        delete process.env.ENCRYPTION_KEY;
        // Deterministic in-memory rate limiter backend
        delete process.env.REDIS_URL;
        delete process.env.REDIS_PASSWORD;
        delete process.env.REDIS_HOST;
        delete process.env.REDIS_PORT;
        delete process.env.TRUSTED_PROXY_HOPS;
        delete process.env.TRUSTED_CLIENT_IP_HEADER;
        mockVerifyPassword.mockResolvedValue(false);
        mockAccountFindFirst.mockResolvedValue(null);
        mockAccountFindUnique.mockResolvedValue(null);
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    // -----------------------------------------------------------------------
    // Fix 1: anonymous renewable lockout of any known email
    // -----------------------------------------------------------------------
    describe('credentials authorize: failure throttle keying', () => {
        it('REGRESSION: 5 anonymous wrong-password attempts must NOT block the victim from ANOTHER client', async () => {
            mockUserFindUnique.mockResolvedValue(seedUser());
            mockVerifyPassword.mockResolvedValue(false);

            const attackerRequest = loginRequest('203.0.113.99');
            for (let i = 0; i < 5; i++) {
                await expect(
                    credentialsProvider.authorize({ email: VICTIM_EMAIL, password: 'wrong' }, attackerRequest)
                ).rejects.toThrow('Invalid email or password');
            }

            // The victim logs in from their own client with the correct password
            mockVerifyPassword.mockResolvedValue(true);
            const victimRequest = loginRequest('198.51.100.10');
            const result = await credentialsProvider.authorize({ email: VICTIM_EMAIL, password: 'correct' }, victimRequest);
            expect(result).toMatchObject({ id: 'user-1', email: VICTIM_EMAIL });
        });

        it('REGRESSION: a correct-password login is never throttled (only failed verifies count)', async () => {
            mockUserFindUnique.mockResolvedValue(seedUser());

            // Same client, 4 failed attempts first
            const request = loginRequest('203.0.113.100');
            mockVerifyPassword.mockResolvedValue(false);
            for (let i = 0; i < 4; i++) {
                await expect(
                    credentialsProvider.authorize({ email: VICTIM_EMAIL, password: 'wrong' }, request)
                ).rejects.toThrow('Invalid email or password');
            }

            // 5th attempt from the same client with the CORRECT password succeeds
            mockVerifyPassword.mockResolvedValue(true);
            const result = await credentialsProvider.authorize({ email: VICTIM_EMAIL, password: 'correct' }, request);
            expect(result).toMatchObject({ id: 'user-1' });
        });

        it('repeated failures from ONE client are eventually throttled (guessing defense)', async () => {
            mockUserFindUnique.mockResolvedValue(seedUser());
            mockVerifyPassword.mockResolvedValue(false);

            const request = loginRequest('203.0.113.101');
            for (let i = 0; i < 5; i++) {
                await expect(
                    credentialsProvider.authorize({ email: VICTIM_EMAIL, password: 'wrong' }, request)
                ).rejects.toThrow('Invalid email or password');
            }

            // 6th failed verification from the same client: throttled
            await expect(
                credentialsProvider.authorize({ email: VICTIM_EMAIL, password: 'wrong' }, request)
            ).rejects.toThrow('Too many login attempts');
        });

        it('a successful login clears that client+email failure counter', async () => {
            mockUserFindUnique.mockResolvedValue(seedUser());
            const request = loginRequest('203.0.113.102');

            mockVerifyPassword.mockResolvedValue(false);
            for (let i = 0; i < 4; i++) {
                await expect(
                    credentialsProvider.authorize({ email: VICTIM_EMAIL, password: 'wrong' }, request)
                ).rejects.toThrow('Invalid email or password');
            }

            mockVerifyPassword.mockResolvedValue(true);
            await credentialsProvider.authorize({ email: VICTIM_EMAIL, password: 'correct' }, request);

            // Counter was reset: 4 more failures still answer "invalid" (not throttled)
            mockVerifyPassword.mockResolvedValue(false);
            for (let i = 0; i < 4; i++) {
                await expect(
                    credentialsProvider.authorize({ email: VICTIM_EMAIL, password: 'wrong' }, request)
                ).rejects.toThrow('Invalid email or password');
            }
        });

        it('applies a pre-verify per-client gate so one client cannot grind unlimited verifications', async () => {
            mockUserFindUnique.mockResolvedValue(seedUser());
            mockVerifyPassword.mockResolvedValue(true);

            const request = loginRequest('203.0.113.103');
            // login-client limit is 20 per 300s
            for (let i = 0; i < 20; i++) {
                await credentialsProvider.authorize({ email: `user${i}@example.com`, password: 'correct' }, request);
            }
            await expect(
                credentialsProvider.authorize({ email: 'another@example.com', password: 'correct' }, request)
            ).rejects.toThrow('Too many login attempts');
        });

        it('nonexistent accounts do not create email-keyed denial state for real users', async () => {
            // Lookup misses still count failures only for the CALLER's key
            mockUserFindUnique.mockImplementation(({ where }: { where: { email: string } }) =>
                where.email === VICTIM_EMAIL ? Promise.resolve(seedUser()) : Promise.resolve(null));
            mockVerifyPassword.mockResolvedValue(true);

            const attackerRequest = loginRequest('203.0.113.104');
            for (let i = 0; i < 8; i++) {
                await expect(
                    credentialsProvider.authorize({ email: 'ghost@example.com', password: 'whatever' }, attackerRequest)
                ).rejects.toThrow();
            }

            // The real account is unaffected
            const result = await credentialsProvider.authorize({ email: VICTIM_EMAIL, password: 'correct' }, loginRequest('198.51.100.11'));
            expect(result).toMatchObject({ id: 'user-1' });
        });
    });

    // -----------------------------------------------------------------------
    // Fix 2: web session revocation on tokenVersion bump
    // -----------------------------------------------------------------------
    describe('jwt/session callbacks: tokenVersion revocation', () => {
        it('jwt callback binds the user tokenVersion at sign-in', async () => {
            mockUserFindUnique.mockResolvedValue({ tokenVersion: 3 });

            const token = await callbacks.jwt({ token: {}, user: { id: 'user-1' } });

            expect(token.id).toBe('user-1');
            expect(token.tokenVersion).toBe(3);
            expect(mockUserFindUnique).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 'user-1' }, select: { tokenVersion: true } })
            );
        });

        it('jwt callback defaults tokenVersion to 0 when the lookup misses', async () => {
            mockUserFindUnique.mockResolvedValue(null);
            const token = await callbacks.jwt({ token: {}, user: { id: 'ghost' } });
            expect(token.tokenVersion).toBe(0);
        });

        it('REGRESSION: session with a stale bound tokenVersion is revoked (password reset bumped it)', async () => {
            mockAccountFindFirst.mockResolvedValue({ providerAccountId: '42', expires_at: null });
            mockUserFindUnique.mockResolvedValue({ tokenVersion: 2, lastSyncAt: null, authMethod: 'email', image: null, name: 'Victim' });

            const session = await callbacks.session({
                session: { user: { id: 'placeholder', email: VICTIM_EMAIL, name: 'Victim' } },
                token: { id: 'user-1', tokenVersion: 1 },
            });

            // Identity stripped: every session?.user?.id guard downstream fails
            expect(session.user.id).toBe('');
            expect(session.user.email).toBeNull();
            expect(session.user.name).toBeNull();
            expect(session.user.hasStrava).toBe(false);
        });

        it('sessions whose tokenVersion still matches keep working and get enriched', async () => {
            mockAccountFindFirst.mockResolvedValue({ providerAccountId: '42', expires_at: null });
            mockUserFindUnique.mockResolvedValue({ tokenVersion: 2, lastSyncAt: null, authMethod: 'email', image: null, name: 'Victim' });

            const session = await callbacks.session({
                session: { user: {} },
                token: { id: 'user-1', tokenVersion: 2 },
            });

            expect(session.user.id).toBe('user-1');
            expect(session.user.hasStrava).toBe(true);
            expect(session.user.authMethod).toBe('email');
        });

        it('legacy sessions without a claim are treated as version 0 and keep working', async () => {
            mockAccountFindFirst.mockResolvedValue(null);
            mockUserFindUnique.mockResolvedValue({ tokenVersion: 0, lastSyncAt: null, authMethod: 'strava', image: null, name: null });

            const session = await callbacks.session({
                session: { user: {} },
                token: { id: 'user-1' }, // no tokenVersion claim (pre-upgrade session)
            });

            expect(session.user.id).toBe('user-1');
        });

        it('REGRESSION: a claim-less legacy session IS revoked when the user tokenVersion was bumped', async () => {
            // e.g. the password was reset after the (legacy) session was issued
            mockAccountFindFirst.mockResolvedValue(null);
            mockUserFindUnique.mockResolvedValue({ tokenVersion: 1, lastSyncAt: null, authMethod: 'email', image: null, name: null });

            const session = await callbacks.session({
                session: { user: {} },
                token: { id: 'user-1' },
            });

            expect(session.user.id).toBe('');
        });
    });

    // -----------------------------------------------------------------------
    // Fix 3: fail-closed Strava token encryption
    // -----------------------------------------------------------------------
    describe('signIn callback: token encryption', () => {
        const stravaAccount = () => ({
            provider: 'strava',
            providerAccountId: 'athlete-42',
            access_token: 'plaintext-access-token',
            refresh_token: 'plaintext-refresh-token',
            expires_at: 1893456000,
            token_type: 'Bearer',
            scope: 'read',
        });

        it('REGRESSION: missing ENCRYPTION_KEY aborts sign-in and persists nothing', async () => {
            delete process.env.ENCRYPTION_KEY;
            const account = stravaAccount();

            const result = await callbacks.signIn({ account });

            expect(result).toBe(false);
            expect(mockAccountUpdate).not.toHaveBeenCalled();
            // The raw tokens must not have been swapped onto the account
            expect(account.access_token).toBe('plaintext-access-token');
        });

        it('REGRESSION: an invalid (wrong length) ENCRYPTION_KEY aborts sign-in too', async () => {
            // The shipped .env.example placeholder decodes to 27 bytes
            process.env.ENCRYPTION_KEY = 'generate-32-byte-base64-key-for-prod';
            const account = stravaAccount();

            const result = await callbacks.signIn({ account });

            expect(result).toBe(false);
            expect(mockAccountUpdate).not.toHaveBeenCalled();
        });

        it('with a valid key the sign-in proceeds and stores decryptable ciphertext', async () => {
            process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64');
            mockAccountFindUnique.mockResolvedValue({ id: 'account-1', userId: 'user-1' });
            const account = stravaAccount();

            const result = await callbacks.signIn({ account });

            expect(result).toBe(true);
            expect(mockAccountUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'account-1' },
                    data: expect.objectContaining({
                        access_token: expect.any(String),
                        refresh_token: expect.any(String),
                    }),
                })
            );
            const updateArgs = mockAccountUpdate.mock.calls[0][0] as { data: { access_token: string; refresh_token: string } };
            expect(updateArgs.data.access_token).not.toBe('plaintext-access-token');
            expect(decryptToken(updateArgs.data.access_token)).toBe('plaintext-access-token');
            expect(decryptToken(updateArgs.data.refresh_token)).toBe('plaintext-refresh-token');
            // The account handed to the adapter also carries ciphertext
            expect(decryptToken(account.access_token as string)).toBe('plaintext-access-token');
        });

        it('credentials sign-ins bypass the encryption path', async () => {
            const result = await callbacks.signIn({ account: { provider: 'credentials' } });
            expect(result).toBe(true);
            expect(mockAccountUpdate).not.toHaveBeenCalled();
        });
    });
});
