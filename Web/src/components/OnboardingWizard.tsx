'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, RefreshCw, Calendar, Link2 } from 'lucide-react';
import AnalyticsDashboard from './AnalyticsDashboard';
import PlanSetupForm from './PlanSetupForm';
import SyncPlatformSelector from './SyncPlatformSelector';
import { useEffect } from 'react';

export default function OnboardingWizard() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const hasStrava = (session?.user as any)?.hasStrava || false;

    const [step, setStep] = useState(() => {
        const p = searchParams.get('step');
        if (p) return parseInt(p);
        // If user has Strava, start at step 1 (sync), otherwise step 0 (platform selection)
        return hasStrava ? 1 : 0;
    });

    // Update step when session loads
    useEffect(() => {
        if (session && step === 0 && hasStrava) {
            setStep(1);
        }
    }, [session, hasStrava, step]);

    // Sync Logic (Step 1)
    const { data: syncStatus } = useQuery({
        queryKey: ['sync-status'],
        queryFn: async () => (await fetch('/api/sync')).json(),
        refetchInterval: (query) => query.state.data?.syncInProgress ? 1000 : false,
    });

    const [importRange, setImportRange] = useState('ALL');

    const syncMutation = useMutation({
        mutationFn: async () => await fetch('/api/sync', {
            method: 'POST',
            body: JSON.stringify({ range: importRange }),
            headers: { 'Content-Type': 'application/json' }
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sync-status'] });
        }
    });

    // Auto-advance to step 2 when sync completes
    // Auto-advance logic removed or simplified - we want user to click Continue
    // to confirm they see the result (even if 0 activities)

    // Analysis Logic (Step 2 and 3) - fetch stats for VO2max
    const { data: statsData } = useQuery({
        queryKey: ['analytics-stats'],
        queryFn: async () => {
            const res = await fetch('/api/analytics/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        },
        enabled: step >= 2,
    });

    // Fetch activities for analysis display
    const { data: activitiesData } = useQuery({
        queryKey: ['activities', 'run'],
        queryFn: async () => (await fetch('/api/activities?limit=100')).json(),
        enabled: step >= 2,
    });

    // Helper to calculate VDOT from activities
    const currentVdot = activitiesData?.activities?.[0]?.estimatedVdot || null;
    const effectiveVO2max = statsData?.effectiveVO2max || 0;
    const shapePercent = statsData?.marathonShape?.shape || 0;

    // Fetch User Profile for Calibration
    const { data: profile } = useQuery({
        queryKey: ['user-profile'],
        queryFn: async () => (await fetch('/api/settings/profile')).json(),
        enabled: !!session,
    });

    return (
        <div className="min-h-screen bg-background text-white flex flex-col">
            {/* Progress Bar */}
            <div className="w-full h-1 bg-gray-800">
                <div
                    className="h-full bg-accent-orange transition-all duration-500 ease-out"
                    style={{ width: `${((step + 1) / 4) * 100}%` }}
                />
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full p-6 flex flex-col justify-center">
                {/* Step 0: Sync Platform Selection (for email users) */}
                {step === 0 && (
                    <div className="max-w-2xl mx-auto animate-fade-in">
                        <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-6">
                            <Link2 className="w-8 h-8" />
                        </div>
                        <SyncPlatformSelector
                            connectedPlatforms={hasStrava ? ['strava'] : []}
                            onSkip={() => setStep(1)}
                            zoneSettings={profile ? {
                                z1: profile.hrZone1Max,
                                z2: profile.hrZone2Max,
                                z3: profile.hrZone3Max,
                                z4: profile.hrZone4Max,
                                z5: profile.hrZone5Max,
                                z6: profile.hrZone6Max,
                            } : undefined}
                        />
                    </div>
                )}

                {/* Step 1: Sync */}
                {step === 1 && (
                    <div className="max-w-md mx-auto text-center space-y-6 animate-fade-in">
                        <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-6">
                            <RefreshCw className={`w-8 h-8 ${syncStatus?.syncInProgress ? 'animate-spin' : ''}`} />
                        </div>

                        <h1 className="text-3xl font-bold">Import your history</h1>
                        <p className="text-gray-400">
                            RunFlow needs your Strava history to start your adaptive training plan.
                        </p>

                        <div className="glass-card p-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-300">Activities found</span>
                                <span className="text-2xl font-bold">{syncStatus?.totalActivities || 0}</span>
                            </div>
                            {syncStatus?.syncInProgress && (
                                <p className="text-sm text-blue-400 animate-pulse">
                                    Syncing active... this might take a minute.
                                </p>
                            )}
                        </div>

                        {!syncStatus?.syncInProgress && (
                            <div className="space-y-4">
                                <div className="text-left">
                                    <label className="block text-sm font-medium text-gray-400 mb-1 ml-1">Import Range</label>
                                    <select
                                        value={importRange}
                                        onChange={(e) => setImportRange(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-accent-orange outline-none"
                                    >
                                        <option value="1_MONTH">Last Month</option>
                                        <option value="3_MONTHS">Last 3 Months</option>
                                        <option value="6_MONTHS">Last 6 Months</option>
                                        <option value="1_YEAR">Last Year</option>
                                        <option value="2_YEARS">Last 2 Years</option>
                                        <option value="ALL">All History</option>
                                    </select>
                                </div>
                                <button
                                    onClick={() => syncMutation.mutate()}
                                    disabled={syncMutation.isPending}
                                    className="btn-primary w-full py-3"
                                >
                                    {syncMutation.isPending ? 'Starting...' : (syncStatus?.totalActivities || 0) > 0 ? 'Update Import' : 'Start Import'}
                                </button>
                            </div>
                        )}

                        {!syncStatus?.syncInProgress && (
                            <div className="flex flex-col gap-3">
                                {(syncStatus?.totalActivities || 0) > 0 ? (
                                    <button
                                        onClick={() => setStep(2)}
                                        className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                                    >
                                        Analyze Data <ArrowRight className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setStep(2)}
                                        className="w-full py-3 flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        Continue without activities <ArrowRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Analyze */}
                {step === 2 && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold mb-2">Your Running Profile</h1>
                            {(activitiesData?.activities?.length || 0) > 0 ? (
                                <p className="text-gray-400">Based on your last {activitiesData?.activities?.length} activities</p>
                            ) : (
                                <p className="text-gray-400">No activities found yet. We&apos;ll use default values to get you started.</p>
                            )}
                        </div>

                        <AnalyticsDashboard
                            currentVdot={currentVdot}
                        />

                        <div className="flex justify-center mt-8">
                            <button
                                onClick={() => setStep(3)}
                                className="btn-primary py-3 px-8 flex items-center justify-center gap-2"
                            >
                                Build My Plan <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Plan Setup - Using unified PlanSetupForm */}
                {step === 3 && (
                    <div className="max-w-xl mx-auto animate-fade-in">
                        <div className="text-center mb-8">
                            <Calendar className="w-12 h-12 text-accent-orange mx-auto mb-4" />
                            <h1 className="text-3xl font-bold mb-2">Build Your Plan</h1>
                            <p className="text-gray-400">Set up your race goal and training preferences.</p>
                        </div>

                        <div className="glass-card p-6">
                            <PlanSetupForm
                                mode="onboarding"
                                onSuccess={() => router.push('/')}
                                effectiveVO2max={effectiveVO2max}
                                shapePercent={shapePercent}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
