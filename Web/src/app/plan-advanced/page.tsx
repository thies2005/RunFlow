'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PlanLanding } from './components/PlanLanding';

export default function PlanAdvancedPage() {
    const router = useRouter();

    const { data, isLoading } = useQuery<{ plans: Array<{ id: string; isActive: boolean }> }>({
        queryKey: ['plan-advanced'],
        queryFn: async () => {
            const res = await fetch('/api/plan-advanced');
            if (!res.ok) throw new Error('Failed to fetch plans');
            return res.json();
        },
    });

    useEffect(() => {
        if (data) {
            const activePlan = data.plans?.find((p) => p.isActive);
            if (activePlan) {
                router.replace(`/plan-advanced/${activePlan.id}`);
            }
        }
    }, [data, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-zinc-600 border-t-zinc-100 rounded-full animate-spin" />
            </div>
        );
    }

    if (data?.plans?.find((p) => p.isActive)) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-zinc-600 border-t-zinc-100 rounded-full animate-spin" />
            </div>
        );
    }

    return <PlanLanding />;
}
