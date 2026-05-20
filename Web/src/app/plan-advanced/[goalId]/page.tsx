'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { PlanEditorLayout } from './components/PlanEditorLayout';

interface PlanData {
    plan: {
        id: string;
        name: string;
        raceDate: string | null;
        raceType: string | null;
        planStartDate: string | null;
        currentVdot: number | null;
        workouts: Array<{
            id: string;
            scheduledDate: string;
            workoutType: string;
            description: string;
            targetDistance: number | null;
            targetPace: number | null;
            targetDuration: number | null;
            targetHrZone: number | null;
            notes: string;
            phase: string;
            customName: string;
            colorOverride: string;
            structuredSteps: any;
            isCompleted: boolean;
        }>;
    };
}

export default function GoalEditorPage() {
    const params = useParams<{ goalId: string }>();
    const router = useRouter();

    const { data, isLoading, error } = useQuery<PlanData>({
        queryKey: ['plan-advanced', params.goalId],
        queryFn: async () => {
            const res = await fetch(`/api/plan-advanced/${params.goalId}`);
            if (res.status === 404) throw new Error('Plan not found');
            if (!res.ok) throw new Error('Failed to fetch plan');
            return res.json();
        },
        enabled: !!params.goalId,
    });

    if (isLoading) {
        return (
            <div className="h-screen bg-zinc-950 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-zinc-600 border-t-zinc-100 rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !data?.plan) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
                <div className="text-center space-y-3">
                    <p className="text-sm text-zinc-400">Plan not found or an error occurred.</p>
                    <button
                        type="button"
                        onClick={() => router.push('/plan-advanced')}
                        className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
                    >
                        Back to Plans
                    </button>
                </div>
            </div>
        );
    }

    const plan = data.plan;
    const raceDate = plan.raceDate ? new Date(plan.raceDate) : null;
    const planStartDate = plan.planStartDate ? new Date(plan.planStartDate) : null;

    return (
        <PlanEditorLayout
            goalId={plan.id}
            planName={plan.name}
            workouts={plan.workouts || []}
            raceDate={raceDate}
            raceType={plan.raceType}
            planStartDate={planStartDate}
            currentVdot={plan.currentVdot}
        />
    );
}
