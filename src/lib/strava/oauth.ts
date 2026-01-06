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
            // Fix: Strava Provider returns 'athlete' object which breaks PrismaAdapter
            // We must remove it before NextAuth tries to save the account
            if (account && 'athlete' in account) {
                delete (account as any).athlete;
            }
            return true;
        },
        async session({ session, user }) {
            // Ensure user ID is always set
            if (session.user && user) {
                session.user.id = user.id;

                try {
                    // Check if user has valid Strava connection via Account table
                    const account = await prisma.account.findFirst({
                        where: {
                            userId: user.id,
                            provider: 'strava'
                        },
                        select: {
                            providerAccountId: true,
                            expires_at: true,
                        }
                    });

                    // Sync status logic (optional fallback to user fields if needed, 
                    // but primarily we should check the Account presence)
                    const dbUser = await prisma.user.findUnique({
                        where: { id: user.id },
                        select: { lastSyncAt: true }
                    });

                    session.user.hasStrava = !!account;
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
    const account = await prisma.account.findFirst({
        where: {
            userId: userId,
            provider: 'strava'
        }
    });

    if (!account?.refresh_token) {
        return null;
    }

    // Check if token is still valid (with 5 min buffer)
    // expires_at is in seconds (Unix timestamp)
    if (account.expires_at && account.expires_at * 1000 > Date.now() + 5 * 60 * 1000) {
        return account.access_token;
    }

    // Refresh the token
    const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: account.refresh_token,
        }),
    });

    if (!response.ok) {
        console.error('Failed to refresh Strava token:', await response.text());
        return null;
    }

    const data = await response.json();

    // Update account with new tokens
    await prisma.account.update({
        where: {
            id: account.id
        },
        data: {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: data.expires_at,
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
