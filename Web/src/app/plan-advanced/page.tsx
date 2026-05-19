'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import PlanSetupForm from '@/components/PlanSetupForm';

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

    if (data?.goals?.find((p) => p.isActive)) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-zinc-600 border-t-zinc-100 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10 max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-zinc-100">Advanced Plan Builder</h1>
                <p className="text-sm text-zinc-500 mt-1">Create and customize your training plan with full control.</p>
            </div>
            <PlanSetupForm
                mode="advanced"
                onSuccess={(planId?: string) => {
                    if (planId) {
                        router.push(`/plan-advanced/${planId}`);
                    } else {
                        router.push('/plan-advanced');
                    }
                }}
            />
        </div>
    );
}
