'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowRight, CheckCircle, RefreshCw, BarChart2, Calendar, Check } from 'lucide-react';
import AnalyticsDashboard from './AnalyticsDashboard';

export default function OnboardingWizard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const [step, setStep] = useState(() => {
        const p = searchParams.get('step');
        return p ? parseInt(p) : 1;
    });

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
    });

    // Analysis Logic (Step 2)
    const { data: activitiesData } = useQuery({
        queryKey: ['activities', 'run'],
        queryFn: async () => (await fetch('/api/activities?limit=100&type=RUN')).json(),
        enabled: step >= 2,
    }); // Fetch more for analysis

    // Goal Logic (Step 3)
    const [goalName, setGoalName] = useState('My First Race');
    const [raceType, setRaceType] = useState('FIVE_K');
    const [raceDate, setRaceDate] = useState(new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 12 weeks from now

    // Training Frequency (0-5)
    const [runsPerWeek, setRunsPerWeek] = useState(4);
    const [ridesPerWeek, setRidesPerWeek] = useState(0);
    const [strengthPerWeek, setStrengthPerWeek] = useState(0);
    const [swimsPerWeek, setSwimsPerWeek] = useState(0);

    const createGoalMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: goalName,
                    raceType,
                    raceDate,
                    planWeeks: 12,
                    runsPerWeek,
                    ridesPerWeek,
                    strengthPerWeek,
                    swimsPerWeek,
                }),
            });
            if (!res.ok) throw new Error('Failed to create goal');
            return res.json();
        },
        onSuccess: () => {
            router.push('/');
        },
        onError: (error) => {
            console.error('Goal creation failed:', error);
            alert('Failed to create goal. Please try again.');
        }
    });

    // Helper to calculate VDOT from activities
    const currentVdot = activitiesData?.activities?.[0]?.estimatedVdot || null;

    return (
        <div className="min-h-screen bg-background text-white flex flex-col">
            {/* Progress Bar */}
            <div className="w-full h-1 bg-gray-800">
                <div
                    className="h-full bg-accent-orange transition-all duration-500 ease-out"
                    style={{ width: `${(step / 3) * 100}%` }}
                />
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full p-6 flex flex-col justify-center">
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

                        {!syncStatus?.syncInProgress && syncStatus?.totalActivities === 0 && (
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
                                    {syncMutation.isPending ? 'Starting...' : 'Start Import'}
                                </button>
                            </div>
                        )}

                        {!syncStatus?.syncInProgress && (syncStatus?.totalActivities || 0) > 0 && (
                            <button
                                onClick={() => setStep(2)}
                                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                            >
                                Analyze Data <ArrowRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}

                {/* Step 2: Analyze */}
                {step === 2 && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold mb-2">Your Running Profile</h1>
                            <p className="text-gray-400">Based on your last {activitiesData?.activities?.length || 0} activities</p>
                        </div>

                        <AnalyticsDashboard
                            activities={activitiesData?.activities || []}
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

                {/* Step 3: Plan Selection */}
                {step === 3 && (
                    <div className="max-w-xl mx-auto space-y-8 animate-fade-in">
                        <div className="text-center">
                            <Calendar className="w-12 h-12 text-accent-orange mx-auto mb-4" />
                            <h1 className="text-3xl font-bold mb-2">Target Race</h1>
                            <p className="text-gray-400">We'll build a custom plan leading up to this event.</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Goal Name</label>
                                <input
                                    type="text"
                                    value={goalName}
                                    onChange={(e) => setGoalName(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-accent-orange outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Distance</label>
                                    <select
                                        value={raceType}
                                        onChange={(e) => setRaceType(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-accent-orange outline-none"
                                    >
                                        <option value="FIVE_K">5K</option>
                                        <option value="TEN_K">10K</option>
                                        <option value="HALF_MARATHON">Half Marathon</option>
                                        <option value="MARATHON">Marathon</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Race Date</label>
                                    <input
                                        type="date"
                                        value={raceDate}
                                        onChange={(e) => setRaceDate(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-accent-orange outline-none"
                                    />
                                </div>
                            </div>

                            {/* Training Frequency */}
                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Runs/wk</label>
                                    <select
                                        value={runsPerWeek}
                                        onChange={(e) => setRunsPerWeek(Number(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-accent-orange outline-none"
                                    >
                                        {[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Rides/wk</label>
                                    <select
                                        value={ridesPerWeek}
                                        onChange={(e) => setRidesPerWeek(Number(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-accent-orange outline-none"
                                    >
                                        {[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Strength/wk</label>
                                    <select
                                        value={strengthPerWeek}
                                        onChange={(e) => setStrengthPerWeek(Number(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-accent-orange outline-none"
                                    >
                                        {[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Swims/wk</label>
                                    <select
                                        value={swimsPerWeek}
                                        onChange={(e) => setSwimsPerWeek(Number(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-accent-orange outline-none"
                                    >
                                        {[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="glass-card p-4 flex items-start gap-3 bg-blue-500/10 border-blue-500/20">
                                <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-semibold text-blue-300">Adaptive Plan</h4>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Your plan will automatically adjust paces based on your VDOT ({currentVdot?.toFixed(1) || 'estimated'}) and training response.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => createGoalMutation.mutate()}
                                disabled={createGoalMutation.isPending}
                                className="btn-primary w-full py-4 text-lg font-bold flex items-center justify-center gap-2 mt-6"
                            >
                                {createGoalMutation.isPending ? 'Generating Plan...' : 'Generate Training Plan'}
                                {!createGoalMutation.isPending && <Check className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
