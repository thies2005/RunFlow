'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

/**
 * Returns whether the current user has premium (tier2/tier3/admin) access.
 * Used to conditionally show AI features in the advanced plan editor.
 */
export function useIsPremium(): { isPremium: boolean; isLoading: boolean } {
    const { data: session } = useSession();

    const { data, isLoading } = useQuery<{ isPremium: boolean }>({
        queryKey: ['user-premium'],
        queryFn: async () => {
            const res = await fetch('/api/user/tier');
            if (!res.ok) return { isPremium: false };
            return res.json();
        },
        enabled: !!session?.user,
        staleTime: 60_000,
    });

    return {
        isPremium: data?.isPremium ?? false,
        isLoading,
    };
}
