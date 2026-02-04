/**
 * Strava OAuth Configuration for NextAuth
 * With additional Credentials provider for email/password auth
 */

import { AuthOptions } from 'next-auth';
import StravaProvider from 'next-auth/providers/strava';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';
import { encryptToken, decryptToken } from '@/lib/crypto';
import { verifyPassword } from '@/lib/auth/auth-email';

export const authOptions: AuthOptions = {
    adapter: PrismaAdapter(prisma) as any,
    providers: [
        StravaProvider({
            clientId: process.env.STRAVA_CLIENT_ID!,
            clientSecret: process.env.STRAVA_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: 'read,activity:read_all,profile:read_all',
                },
            },
        }),
        CredentialsProvider({


            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Email and password are required');
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email.toLowerCase() }
                });

                if (!user || !user.passwordHash) {
                    throw new Error('Invalid email or password');
                }

                const isValid = await verifyPassword(credentials.password, user.passwordHash);
                if (!isValid) {
                    throw new Error('Invalid email or password');
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                };
            }
        }),
    ],
    callbacks: {
        async signIn({ user, account }: { user: any, account: any }) {
            // Skip token handling for credentials provider
            if (account?.provider === 'credentials') {
                return true;
            }

            // Fix: Strava Provider returns 'athlete' object which breaks PrismaAdapter
            // We must remove it before NextAuth tries to save the account
            if (account && 'athlete' in account) {
                delete (account as any).athlete;
            }

            // Encrypt tokens before they're stored by the adapter
            if (account?.access_token) {
                account.access_token = encryptToken(account.access_token);
            }
            if (account?.refresh_token) {
                account.refresh_token = encryptToken(account.refresh_token);
            }

            return true;
        },
        async jwt({ token, user }: { token: any, user: any }) {
            // Persist the user id to the token on first sign in
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token, user }: { session: any, token: any, user: any }) {
            // For JWT strategy, get user from token; for database strategy, from user
            const userId = token?.id || user?.id;

            if (session.user && userId) {
                session.user.id = userId;

                try {
                    // Check if user has valid Strava connection via Account table
                    const stravaAccount = await prisma.account.findFirst({
                        where: {
                            userId: userId,
                            provider: 'strava'
                        },
                        select: {
                            providerAccountId: true,
                            expires_at: true,
                        }
                    });

                    // Get user's sync status and auth method
                    const dbUser = await prisma.user.findUnique({
                        where: { id: userId },
                        select: { lastSyncAt: true, authMethod: true }
                    });

                    session.user.hasStrava = !!stravaAccount;
                    session.user.authMethod = dbUser?.authMethod || 'strava';
                    session.user.lastSyncAt = dbUser?.lastSyncAt?.toISOString() ?? null;
                } catch (error) {
                    console.error('Error fetching user data for session:', error);
                    session.user.hasStrava = false;
                    session.user.authMethod = 'strava';
                    session.user.lastSyncAt = null;
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
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    // Cookie configuration for HTTPS behind reverse proxy (Cloudflare Tunnel)
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
                maxAge: 60 * 15, // 15 minutes
            },
        },
        state: {
            name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.state' : 'next-auth.state',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 15, // 15 minutes
            },
        },
    },
    debug: process.env.NODE_ENV === 'development',
};

/**
 * Refresh Strava access token if expired
 * Handles encrypted tokens - decrypts for use, encrypts when storing
 */
export async function refreshStravaToken(userId: string): Promise<string | null> {
    const account = await prisma.account.findFirst({
        where: {
            userId: userId,
            provider: 'strava'
        }
    });

    if (!account?.refresh_token) {
        return null;
    }

    // Decrypt refresh token for use
    const decryptedRefreshToken = decryptToken(account.refresh_token);

    // Check if token is still valid (with 5 min buffer)
    // expires_at is in seconds (Unix timestamp)
    if (account.expires_at && account.expires_at * 1000 > Date.now() + 5 * 60 * 1000) {
        // Decrypt access token before returning
        return account.access_token ? decryptToken(account.access_token) : null;
    }

    // Refresh the token
    const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: decryptedRefreshToken,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to refresh Strava token: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Encrypt tokens before storing
    await prisma.account.update({
        where: {
            id: account.id
        },
        data: {
            access_token: encryptToken(data.access_token),
            refresh_token: encryptToken(data.refresh_token),
            expires_at: data.expires_at,
        },
    });

    // Return the plaintext access token for immediate use
    return data.access_token;
}


