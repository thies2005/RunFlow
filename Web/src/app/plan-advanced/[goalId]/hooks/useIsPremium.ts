'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

/**
 * Returns whether the current user can access Plan Builder AI features
 * (tier2/tier3/admin, active BYOK, or tier1 with explicit planBuilder routing).
 * Preserves the `isPremium` property name for existing consumers.
 */
export function useIsPremium(): { isPremium: boolean; canUsePlanBuilder: boolean; isLoading: boolean } {
    const { data: session } = useSession();

    const { data, isLoading } = useQuery<{ isPremium?: boolean; canUsePlanBuilder?: boolean }>({
        queryKey: ['user-premium'],
        queryFn: async () => {
            const res = await fetch('/api/user/tier');
            if (!res.ok) return { isPremium: false, canUsePlanBuilder: false };
            return res.json();
        },
        enabled: !!session?.user,
        staleTime: 60_000,
    });

    const canUsePlanBuilder = data?.canUsePlanBuilder ?? data?.isPremium ?? false;

    return {
        isPremium: canUsePlanBuilder,
        canUsePlanBuilder,
        isLoading,
    };
}
