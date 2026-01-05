/**
 * Strava OAuth Configuration for NextAuth
 */

import { AuthOptions } from 'next-auth';
import StravaProvider from 'next-auth/providers/strava';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';

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
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === 'strava' && account.providerAccountId) {
                try {
                    // Store Strava-specific data on the user
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            stravaId: account.providerAccountId,
                            stravaAccessToken: account.access_token,
                            stravaRefreshToken: account.refresh_token,
                            stravaTokenExpiry: account.expires_at
                                ? new Date(account.expires_at * 1000)
                                : null,
                        },
                    });
                } catch (error) {
                    console.error('Error storing Strava tokens:', error);
                    // Don't block sign-in if token storage fails
                }
            }
            return true;
        },
        async session({ session, user }) {
            // Ensure user ID is always set
            if (session.user && user) {
                session.user.id = user.id;

                try {
                    // Check if user has valid Strava connection
                    const dbUser = await prisma.user.findUnique({
                        where: { id: user.id },
                        select: {
                            stravaId: true,
                            stravaTokenExpiry: true,
                            lastSyncAt: true,
                        },
                    });

                    session.user.hasStrava = !!dbUser?.stravaId;
                    session.user.lastSyncAt = dbUser?.lastSyncAt?.toISOString() ?? null;
                } catch (error) {
                    console.error('Error fetching user data for session:', error);
                    session.user.hasStrava = false;
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
        strategy: 'database',
    },
    debug: process.env.NODE_ENV === 'development',
};

/**
 * Refresh Strava access token if expired
 */
export async function refreshStravaToken(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            stravaRefreshToken: true,
            stravaAccessToken: true,
            stravaTokenExpiry: true,
        },
    });

    if (!user?.stravaRefreshToken) {
        return null;
    }

    // Check if token is still valid (with 5 min buffer)
    if (user.stravaTokenExpiry && user.stravaTokenExpiry > new Date(Date.now() + 5 * 60 * 1000)) {
        return user.stravaAccessToken;
    }

    // Refresh the token
    const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: user.stravaRefreshToken,
        }),
    });

    if (!response.ok) {
        console.error('Failed to refresh Strava token:', await response.text());
        return null;
    }

    const data = await response.json();

    // Update user with new tokens
    await prisma.user.update({
        where: { id: userId },
        data: {
            stravaAccessToken: data.access_token,
            stravaRefreshToken: data.refresh_token,
            stravaTokenExpiry: new Date(data.expires_at * 1000),
        },
    });

    return data.access_token;
}

// Extend NextAuth types
declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            hasStrava: boolean;
            lastSyncAt: string | null;
        };
    }
}
