import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import StravaProvider from 'next-auth/providers/strava';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';
import { encryptToken } from '@/lib/crypto';
import { verifyPassword } from '@/lib/auth/auth-email';
import { TIME_RANGES } from '@/lib/constants';
import { logger } from '@/lib/logging/logger';
import { checkRateLimitAsync } from '@/lib/rateLimit';

function tryEncryptOrPlaintextToken(
    token: string | null | undefined,
    tokenType: 'access' | 'refresh',
    providerAccountId?: string
): string | null {
    if (!token) {
        return null;
    }

    try {
        return encryptToken(token);
    } catch (error) {
        logger.warn('Failed to encrypt Strava token, storing plaintext fallback', {
            tokenType,
            providerAccountId,
            error: error instanceof Error ? error.message : String(error),
        });
        return token;
    }
}

const authConfig = {
    adapter: PrismaAdapter(prisma),
    providers: [
        StravaProvider({
            clientId: process.env.STRAVA_CLIENT_ID!,
            clientSecret: process.env.STRAVA_CLIENT_SECRET!,
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
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Email and password are required');
                }

                const identifier = (credentials.email as string).toLowerCase();
                const rateLimitResult = await checkRateLimitAsync(identifier, {
                    limit: 5,
                    windowSeconds: 300,
                    prefix: 'login',
                });

                if (!rateLimitResult.allowed) {
                    logger.warn('Rate limit exceeded for login', { email: identifier });
                    throw new Error('Too many login attempts. Please try again later.');
                }

                const user = await prisma.user.findUnique({
                    where: { email: identifier },
                });

                if (!user || !user.passwordHash) {
                    throw new Error('Invalid email or password');
                }

                const isValid = await verifyPassword(credentials.password as string, user.passwordHash);
                if (!isValid) {
                    throw new Error('Invalid email or password');
                }

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

            const encryptedAccess = tryEncryptOrPlaintextToken(
                account?.access_token,
                'access',
                account?.providerAccountId
            );
            const encryptedRefresh = tryEncryptOrPlaintextToken(
                account?.refresh_token,
                'refresh',
                account?.providerAccountId
            );

            if (account?.provider === 'strava' && account.providerAccountId) {
                try {
                    const existingAccount = await prisma.account.findUnique({
                        where: {
                            provider_providerAccountId: {
                                provider: 'strava',
                                providerAccountId: account.providerAccountId,
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
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
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
                        select: { lastSyncAt: true, authMethod: true, image: true, name: true },
                    });

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
        pkceCodeVerifier: {
            name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.pkce.code_verifier' : 'next-auth.pkce.code_verifier',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 15,
            },
        },
        state: {
            name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.state' : 'next-auth.state',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 15,
            },
        },
    },
    debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
