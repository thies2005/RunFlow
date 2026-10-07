import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import type { Adapter, AdapterAccount } from '@auth/core/adapters';
import StravaProvider from 'next-auth/providers/strava';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';
import { encryptToken } from '@/lib/crypto';
import { verifyPassword } from '@/lib/auth/auth-email';
import { TIME_RANGES } from '@/lib/constants';
import { logger } from '@/lib/logging/logger';
import { checkRateLimitAsync, getClientIdentifier, resetRateLimit } from '@/lib/rateLimit';

function encryptTokenOrFail(
    token: string | null | undefined,
    tokenType: 'access' | 'refresh',
    providerAccountId?: string
): string | null {
    if (!token) {
        return null;
    }
    // Fail closed: when ENCRYPTION_KEY is missing or invalid we must refuse to
    // persist OAuth tokens in plaintext. The error from encryptToken()
    // propagates to the sign-in handler, which aborts the flow.
    try {
        return encryptToken(token);
    } catch (error) {
        logger.error('Refusing to store Strava token in plaintext: encryption unavailable', {
            tokenType,
            providerAccountId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

const baseAdapter = PrismaAdapter(prisma);

const adapter: Adapter = {
    ...baseAdapter,
    async getUserByAccount(account: AdapterAccount) {
        return baseAdapter.getUserByAccount!({
            ...account,
            providerAccountId: String(account.providerAccountId),
        });
    },
    async linkAccount(account: AdapterAccount): Promise<AdapterAccount | null | undefined> {
        return baseAdapter.linkAccount!({
            ...account,
            providerAccountId: String(account.providerAccountId),
        }) as Promise<AdapterAccount | null | undefined>;
    },
};

const authConfig = {
    adapter,
    providers: [
        StravaProvider({
            clientId: process.env.STRAVA_CLIENT_ID!,
            clientSecret: process.env.STRAVA_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: false,
            authorization: {
                params: {
                    scope: 'read,activity:read_all,profile:read_all',
                    approval_prompt: 'auto',
                },
            },
        }),
        CredentialsProvider({
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials, request) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Email and password are required');
                }

                const identifier = (credentials.email as string).toLowerCase();

                // Anti-guessing gate keyed on the CLIENT, never on the bare
                // email: nothing before credential verification may be keyed
                // on caller-supplied data, or a stranger could create denial
                // state for an account they do not control.
                const clientId = getClientIdentifier(request);
                const clientRateLimitResult = await checkRateLimitAsync(clientId, {
                    limit: 20,
                    windowSeconds: 300,
                    prefix: 'login-client',
                });

                if (!clientRateLimitResult.allowed) {
                    logger.warn('Rate limit exceeded for login (per client)', { clientId });
                    throw new Error('Too many login attempts. Please try again later.');
                }

                const user = await prisma.user.findUnique({
                    where: { email: identifier },
                });

                if (!user || !user.passwordHash || !(await verifyPassword(credentials.password as string, user.passwordHash))) {
                    // Count only FAILED verifications, keyed per client + email,
                    // so an anonymous caller cannot lock out someone else's
                    // account - and a correct-password login never consults the
                    // limiter at all.
                    const failureRateLimit = await checkRateLimitAsync(`${clientId}|${identifier}`, {
                        limit: 5,
                        windowSeconds: 300,
                        prefix: 'login',
                    });
                    if (!failureRateLimit.allowed) {
                        logger.warn('Rate limit exceeded for login (failed verifications)', { email: identifier });
                        throw new Error('Too many login attempts. Please try again later.');
                    }
                    throw new Error('Invalid email or password');
                }

                // Successful verification clears this client's failure counter
                // for the account.
                await resetRateLimit(`${clientId}|${identifier}`, 'login');

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                };
            },
        }),
    ],
    callbacks: {
        async signIn({ account }) {
            if (account?.provider === 'credentials') {
                return true;
            }

            if (account && 'athlete' in account) {
                delete (account as Record<string, unknown> & { athlete?: unknown }).athlete;
            }

            // Fail closed: if the OAuth tokens cannot be encrypted (missing or
            // invalid ENCRYPTION_KEY), abort the sign-in instead of persisting
            // plaintext tokens. This must NOT be caught by the generic error
            // handler below, which would continue the flow with raw tokens.
            let encryptedAccess: string | null = null;
            let encryptedRefresh: string | null = null;
            try {
                encryptedAccess = encryptTokenOrFail(
                    account?.access_token,
                    'access',
                    account?.providerAccountId
                );
                encryptedRefresh = encryptTokenOrFail(
                    account?.refresh_token,
                    'refresh',
                    account?.providerAccountId
                );
            } catch {
                return false;
            }

            try {
                if (account?.provider === 'strava' && account.providerAccountId) {
                    try {
                        const existingAccount = await prisma.account.findUnique({
                            where: {
                                provider_providerAccountId: {
                                    provider: 'strava',
                                    providerAccountId: String(account.providerAccountId),
                                },
                            },
                        });

                        if (existingAccount) {
                            await prisma.account.update({
                                where: { id: existingAccount.id },
                                data: {
                                    access_token: encryptedAccess,
                                    refresh_token: encryptedRefresh,
                                    expires_at: account.expires_at,
                                    token_type: account.token_type,
                                    scope: account.scope,
                                },
                            });
                            logger.info('Force-updated Strava tokens', { userId: existingAccount.userId });
                        }
                    } catch (err) {
                        logger.error('Failed to force-update Strava tokens', { error: err instanceof Error ? err.message : String(err) });
                    }
                }

                if (account?.access_token) {
                    (account as unknown as Record<string, unknown>).access_token = encryptedAccess ?? undefined;
                }
                if (account?.refresh_token) {
                    (account as unknown as Record<string, unknown>).refresh_token = encryptedRefresh ?? undefined;
                }

                return true;
            } catch (error) {
                logger.error('Unexpected sign-in callback error, continuing auth flow', {
                    provider: account?.provider,
                    error: error instanceof Error ? error.message : String(error),
                });
                return true;
            }
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                // Bind the current tokenVersion into the session JWT so any
                // later bump (password reset, mobile logout) revokes it in the
                // session callback. A failed lookup leaves the claim absent,
                // which the session callback treats as version 0.
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: user.id },
                        select: { tokenVersion: true },
                    });
                    token.tokenVersion = dbUser?.tokenVersion ?? 0;
                } catch (error) {
                    logger.error('Failed to bind tokenVersion to session token', {
                        userId: user.id,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
            return token;
        },
        async session({ session, token, user }) {
            const userId = (token as unknown as Record<string, unknown>)?.id || (user as unknown as Record<string, unknown>)?.id;



            if (session.user && userId) {
                session.user.id = userId as string;

                try {
                    const stravaAccount = await prisma.account.findFirst({
                        where: {
                            userId: userId as string,
                            provider: 'strava',
                        },
                        select: {
                            providerAccountId: true,
                            expires_at: true,
                        },
                    });

                    const dbUser = await prisma.user.findUnique({
                        where: { id: userId as string },
                        select: { tokenVersion: true, lastSyncAt: true, authMethod: true, image: true, name: true },
                    });

                    // Revoke the session when its bound tokenVersion no longer
                    // matches the database: a password reset or mobile logout
                    // bumped the version after this session was issued.
                    // Sessions issued before this check existed carry no claim
                    // and are treated as version 0, so they keep working
                    // unless the user's tokenVersion has been bumped since.
                    const boundVersion = typeof token.tokenVersion === 'number' ? token.tokenVersion : 0;
                    if (dbUser && dbUser.tokenVersion !== boundVersion) {
                        logger.warn('Revoking stale web session (tokenVersion mismatch)', { userId: String(userId) });
                        // Strip the identity so every `session?.user?.id` guard in
                        // downstream consumers rejects the request.
                        session.user.id = '';
                        (session.user as unknown as Record<string, unknown>).email = null;
                        (session.user as unknown as Record<string, unknown>).name = null;
                        (session.user as unknown as Record<string, unknown>).image = null;
                        (session.user as unknown as Record<string, unknown>).hasStrava = false;
                        (session.user as unknown as Record<string, unknown>).authMethod = 'strava';
                        (session.user as unknown as Record<string, unknown>).lastSyncAt = null;
                        return session;
                    }

                    (session.user as unknown as Record<string, unknown>).hasStrava = !!stravaAccount;
                    (session.user as unknown as Record<string, unknown>).authMethod = dbUser?.authMethod || 'strava';
                    (session.user as unknown as Record<string, unknown>).lastSyncAt = dbUser?.lastSyncAt?.toISOString() ?? null;

                    if (dbUser?.image != null) {
                        session.user.image = dbUser.image;
                    }
                    if (dbUser?.name != null) {
                        session.user.name = dbUser.name;
                    }
                } catch (error) {
                    logger.error('Error fetching user data for session', { error: error instanceof Error ? error.message : String(error) });
                    (session.user as unknown as Record<string, unknown>).hasStrava = false;
                    (session.user as unknown as Record<string, unknown>).authMethod = 'strava';
                    (session.user as unknown as Record<string, unknown>).lastSyncAt = null;
                }
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: TIME_RANGES.SYNC_LOOKBACK_DAYS * 24 * 60 * 60,
    },
    cookies: {
        sessionToken: {
            name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            },
        },
        callbackUrl: {
            name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.callback-url' : 'next-auth.callback-url',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            },
        },
        csrfToken: {
            name: process.env.NODE_ENV === 'production' ? '__Host-next-auth.csrf-token' : 'next-auth.csrf-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            },
        },

    },
    debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig;

// Exported for tests; the runtime surface below is unchanged.
export const authConfigObject = authConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
