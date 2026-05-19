'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Trophy, Zap, Calendar, Lock, ChevronRight, Brain, FileSpreadsheet, BarChart3, Layers } from 'lucide-react';

function FeatureCard({ icon: Icon, title, description }: { icon: typeof Zap; title: string; description: string }) {
    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-left">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-orange-400" />
            </div>
            <h3 className="text-xs font-semibold text-zinc-200 mb-1">{title}</h3>
            <p className="text-[11px] text-zinc-500 leading-relaxed">{description}</p>
        </div>
    );
}

function PremiumUpsell() {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
            <div className="max-w-lg w-full space-y-8">
                <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto">
                        <Lock className="w-8 h-8 text-orange-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-zinc-100 flex items-center justify-center gap-2">
                            <Trophy className="w-5 h-5 text-orange-400" />
                            Advanced Plan Builder
                        </h1>
                        <p className="text-sm text-zinc-500 mt-2">
                            Premium training planning with AI-powered analysis
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <FeatureCard
                        icon={Layers}
                        title="Full Plan Builder"
                        description="Drag & drop editor with multi-goal timeline, sub-goals, and periodization."
                    />
                    <FeatureCard
                        icon={Brain}
                        title="AI Analysis"
                        description="Get AI-powered plan scoring, risk flags, and personalized suggestions."
                    />
                    <FeatureCard
                        icon={FileSpreadsheet}
                        title="CSV Import/Export"
                        description="Import from TrainingPeaks & FinalSurge. Export in any format."
                    />
                    <FeatureCard
                        icon={BarChart3}
                        title="Progress Tracking"
                        description="Race readiness predictions, volume tracking, and fitness progress."
                    />
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left space-y-2.5">
                    <h3 className="text-xs font-semibold text-zinc-300">Also includes:</h3>
                    <ul className="space-y-1.5">
                        {[
                            'Interval progression builder with structured steps',
                            'Advanced pace profiles per training phase',
                            'Mass edit operations (scale, shift, move)',
                            'Template system for week patterns',
                            'Keyboard shortcuts for power users',
                            'Plan snapshots and undo history',
                        ].map((f) => (
                            <li key={f} className="flex items-start gap-2 text-xs text-zinc-500">
                                <ChevronRight className="w-3 h-3 text-orange-400 mt-0.5 shrink-0" />
                                {f}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            window.location.href = '/settings?tab=subscription';
                        }}
                        className="w-full px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white font-medium text-sm transition-colors"
                    >
                        Upgrade to Pro
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            window.location.href = '/settings?tab=subscription';
                        }}
                        className="w-full px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors"
                    >
                        View pricing plans
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function PlanAdvancedLayout({ children }: { children: React.ReactNode }) {
    const { status } = useSession();

    const { data: userTier, isLoading } = useQuery<{ tier: string; isAdmin: boolean }>({
        queryKey: ['user-tier'],
        queryFn: async () => {
            const res = await fetch('/api/plans?parentOnly=true');
            if (res.status === 403) return { tier: 'none', isAdmin: false };
            if (res.ok) return { tier: 'ok', isAdmin: false };
            return { tier: 'none', isAdmin: false };
        },
        staleTime: 1000 * 60 * 5,
        retry: false,
        enabled: status === 'authenticated',
    });

    if (status === 'loading' || (status === 'authenticated' && isLoading)) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-zinc-600 border-t-zinc-100 rounded-full animate-spin" />
            </div>
        );
    }

    if (status === 'unauthenticated') {
        return <PremiumUpsell />;
    }

    if (userTier?.tier === 'none') {
        return <PremiumUpsell />;
    }

    return <>{children}</>;
}
