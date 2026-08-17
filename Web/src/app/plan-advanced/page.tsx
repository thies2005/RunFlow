'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PlanAdvancedPage() {
    const router = useRouter();

    const { data, isLoading } = useQuery<{ goals: Array<{ id: string; isActive: boolean }> }>({
        queryKey: ['plans', { parentOnly: true }],
        queryFn: async () => {
            const res = await fetch('/api/plans?parentOnly=true');
            if (!res.ok) throw new Error('Failed to fetch plans');
            return res.json();
        },
    });

    useEffect(() => {
        if (data) {
            const activePlan = data.goals?.find((p) => p.isActive);
            if (activePlan) {
                router.replace(`/plan-advanced/${activePlan.id}`);
            } else {
                // No active plan — redirect to normal plan creation flow
                router.replace('/onboarding?step=3');
            }
        }
    }, [data, router]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-foreground/25 border-t-foreground rounded-full animate-spin" />
        </div>
    );
}
